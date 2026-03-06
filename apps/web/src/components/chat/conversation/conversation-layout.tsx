import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { LegendListRef } from "@legendapp/list/react";
import { useCallback, useLayoutEffect, useRef } from "react";
import { Conversation } from "@/components/ui-custom/chat/conversation";
import {
  useScrollToBottomActions,
  useScrollToBottomState,
} from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";
import { ScrollEdgeProbe } from "@/hooks/utils/use-scroll-edges";
import { cn } from "@/lib/utils";
import { ConversationMessagesList } from "./_parts/messages-list";

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
  const listRef = useRef<LegendListRef | null>(null);
  const { bottomRef } = useScrollToBottomState();
  const { scrollToBottom } = useScrollToBottomActions();
  const scrollToBottomInstant = useCallback(
    () => scrollToBottom("instant"),
    [scrollToBottom]
  );

  const shouldReserveLastAssistantSpace = useShouldReserveLastAssistantSpace({
    isThreadSettled,
  });

  useOnSubmitMessageLayoutEffect({
    // TODO: make this var name more self explanatory (hard to grasp what it is for here...)
    pendingAutoScrollMessageId, // this update when a new message append needs scroll to bottom
    messages,
    callback: scrollToBottomInstant,
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
 * Scroll runs once submitted message is committed near list tail.
 */
function useOnSubmitMessageLayoutEffect({
  pendingAutoScrollMessageId,
  messages,
  callback,
}: {
  pendingAutoScrollMessageId: string | undefined;
  messages: MyUIMessage[];
  callback: () => void;
}) {
  const lastHandledIntentIdRef = useRef<string | undefined>(undefined);
  const submittedMessageIndex = pendingAutoScrollMessageId
    ? messages.findLastIndex(
        (message) => message.id === pendingAutoScrollMessageId
      )
    : -1;
  const isSubmittedMessageNearTail =
    submittedMessageIndex !== -1 &&
    submittedMessageIndex >= Math.max(0, messages.length - 2);

  useLayoutEffect(() => {
    if (!pendingAutoScrollMessageId) return;
    if (lastHandledIntentIdRef.current === pendingAutoScrollMessageId) return;
    if (!isSubmittedMessageNearTail) return;

    callback();

    lastHandledIntentIdRef.current = pendingAutoScrollMessageId;
  }, [pendingAutoScrollMessageId, callback, isSubmittedMessageNearTail]);
}
