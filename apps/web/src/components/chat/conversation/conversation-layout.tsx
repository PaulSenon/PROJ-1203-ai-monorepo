import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useLayoutEffect, useRef } from "react";
import { Conversation } from "@/components/ui-custom/chat/conversation";
import {
  useScrollToBottomActions,
  useScrollToBottomState,
} from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";
import { ScrollEdgeProbe } from "@/hooks/utils/use-scroll-edges";
import { cn } from "@/lib/utils";
import {
  ConversationMessagesList,
  type EnrichedLegendListRef,
} from "./_parts/messages-list";

export type ChatConversationLayoutProps = {
  messages: MyUIMessage[];
  isThreadSettled: boolean;
  pendingAutoScrollMessageId: string | undefined;
  onStartReached?: () => void;
};

export function ChatConversationLayout({
  messages,
  isThreadSettled,
  pendingAutoScrollMessageId,
  onStartReached,
}: ChatConversationLayoutProps) {
  const listRef = useRef<EnrichedLegendListRef | null>(null);
  const { bottomRef } = useScrollToBottomState();
  const { scrollToBottom } = useScrollToBottomActions();

  const shouldReserveLastAssistantSpace = useShouldReserveLastAssistantSpace({
    isThreadSettled,
  });

  useOnSubmitMessageLayoutEffect({
    // TODO: make this var name more self explanatory (hard to grasp what it is for here...)
    pendingAutoScrollMessageId, // this update when a new message append needs scroll to bottom
    messages,
    // TODO: Find lest hacky way to delay scroll when layout contain last message after submit
    waitForUiLayout: async (id: string) =>
      new Promise((resolve) => {
        listRef.current?.onceLastItemKey(id, resolve);
      }),
    callback: scrollToBottom,
  });

  return (
    <Conversation.Root
      className={cn(
        "relative mx-auto mb-[130px] w-full max-w-3xl flex-1 p-6 md:mb-0"
      )}
    >
      <Conversation.List>
        <ConversationMessagesList
          listRef={listRef}
          messages={messages}
          onStartReached={onStartReached}
          shouldReserveLastAssistantSpace={shouldReserveLastAssistantSpace}
        />
      </Conversation.List>

      <ScrollEdgeProbe ref={bottomRef} />
    </Conversation.Root>
  );
}

/**
 * Business UI rule to latch the state when we should set a "space" bellow last assistant message or not.
 *
 * Expected UX: when a thread is not settled, the last assistant message should have a style toggled to
 * reserve visual space bellow. So we can scroll bottom on submit and have already the window scrolled with
 * plenty of room for the assistant message streaming in before user needs to scroll.
 *
 * Important: Stable layout. We must avoid all layout shift by latching this value one way and only resetting it when
 * thread is reloaded.
 */
function useShouldReserveLastAssistantSpace({
  isThreadSettled,
}: {
  isThreadSettled: boolean;
}) {
  const hasReserveLatchInThreadSessionRef = useRef(!isThreadSettled);

  if (!isThreadSettled) {
    hasReserveLatchInThreadSessionRef.current = true;
  }

  return !isThreadSettled || hasReserveLatchInThreadSessionRef.current;
}

/**
 * Business rule to detect when a new submitted message has been rendered.
 * This hook guarantee to run callback right before new submitted message paint.
 *
 * Currently hacky because since we use a virtualizer, detecting message contains the last commit id isn't sufficient.
 * So instead I plugged a hacky way to await for a callback for when the last key of virtualizer eventually match
 * the mast message id. This must be refactored because quite unreadable and error prone.
 */
function useOnSubmitMessageLayoutEffect({
  pendingAutoScrollMessageId,
  messages,
  waitForUiLayout,
  callback,
}: {
  pendingAutoScrollMessageId: string | undefined;
  messages: MyUIMessage[];
  waitForUiLayout: (id: string) => Promise<void>;
  callback: () => void;
}) {
  const lastHandledIntentIdRef = useRef<string | undefined>(undefined);
  const tailMessageId = messages.at(-1)?.id;
  // const beforeTailMessageId = messages.at(-2)?.id;
  const raceConditionId = useRef<string>(null);

  useLayoutEffect(() => {
    if (!pendingAutoScrollMessageId) return;
    if (lastHandledIntentIdRef.current === pendingAutoScrollMessageId) return;
    if (tailMessageId === undefined) return;

    // Scroll only when submit intent exists and message is committed at list tail.
    // const hasIntentMessageInTail =
    //   tailMessageId === pendingAutoScrollMessageId ||
    //   beforeTailMessageId === pendingAutoScrollMessageId;
    // if (!hasIntentMessageInTail) return;

    raceConditionId.current = pendingAutoScrollMessageId;
    (async () => {
      await waitForUiLayout(tailMessageId);
      if (raceConditionId.current !== pendingAutoScrollMessageId) return;
      callback();
    })();

    lastHandledIntentIdRef.current = pendingAutoScrollMessageId;
  }, [pendingAutoScrollMessageId, tailMessageId, callback, waitForUiLayout]);
}
