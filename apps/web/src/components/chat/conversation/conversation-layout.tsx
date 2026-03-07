import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation } from "@/components/ui-custom/chat/conversation";
import {
  useScrollToBottomActions,
  useScrollToBottomState,
} from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";
import { ScrollEdgeProbe } from "@/hooks/utils/use-scroll-edges";
import { cn } from "@/lib/utils";
import { getOptimisticAssistantShellId } from "./_hooks/use-conversation-display-messages";
import { ConversationMessagesList } from "./_parts/messages-list";

export type ChatConversationLayoutProps = {
  messages: MyUIMessage[];
  isThreadSettled: boolean;
  pendingAutoScrollMessageId: string | undefined;
  threadUuid: string;
  onStartReached?: () => void;
};

export function ChatConversationLayout({
  messages,
  isThreadSettled,
  pendingAutoScrollMessageId,
  threadUuid,
  onStartReached,
}: ChatConversationLayoutProps) {
  const { bottomRef } = useScrollToBottomState();
  const { scrollToBottom } = useScrollToBottomActions();

  const shouldReserveLastAssistantSpace = useShouldReserveLastAssistantSpace({
    isThreadSettled,
  });

  const {
    pendingAutoScrollTargetId,
    handlePendingAutoScrollTargetLayout,
  } = useOnSubmitMessageLayoutEffect({
    pendingAutoScrollMessageId,
    messages,
    callback: scrollToBottom,
    threadUuid,
  });

  return (
    <Conversation.Root
      className={cn(
        "relative mx-auto mb-[130px] w-full max-w-3xl flex-1 p-6 md:mb-0"
      )}
    >
      <Conversation.List>
        <ConversationMessagesList
          messages={messages}
          onStartReached={onStartReached}
          onPendingAutoScrollTargetLayout={handlePendingAutoScrollTargetLayout}
          pendingAutoScrollTargetId={pendingAutoScrollTargetId}
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
  const shouldSeedReserveLatch = !isThreadSettled;

  const [hasReserveLatchInThreadSession, setHasReserveLatchInThreadSession] =
    useState<boolean>(shouldSeedReserveLatch);

  if (!hasReserveLatchInThreadSession && shouldSeedReserveLatch) {
    setHasReserveLatchInThreadSession(true);
  }

  return shouldSeedReserveLatch || hasReserveLatchInThreadSession;
}

/**
 * Business rule to detect when a new submitted message has been rendered with
 * its deterministic optimistic assistant shell.
 *
 * We only scroll when that shell exists and has committed to layout. If the
 * shell is absent, we skip auto-scroll rather than guessing on a later message.
 */
function useOnSubmitMessageLayoutEffect({
  pendingAutoScrollMessageId,
  messages,
  callback,
  threadUuid,
}: {
  pendingAutoScrollMessageId: string | undefined;
  messages: MyUIMessage[];
  callback: () => void;
  threadUuid: string;
}) {
  const lastHandledIntentIdRef = useRef<string | undefined>(undefined);
  const pendingAutoScrollTargetIdRef = useRef<string | undefined>(undefined);
  const pendingAutoScrollMessageIdRef = useRef<string | undefined>(undefined);
  const scrollFrameRef = useRef<number | undefined>(undefined);
  const pendingAutoScrollTargetId = useMemo(() => {
    if (!pendingAutoScrollMessageId) return undefined;

    const optimisticShellId = getOptimisticAssistantShellId(
      threadUuid,
      pendingAutoScrollMessageId
    );
    return messages.some((message) => message.id === optimisticShellId)
      ? optimisticShellId
      : undefined;
  }, [messages, pendingAutoScrollMessageId, threadUuid]);

  pendingAutoScrollTargetIdRef.current = pendingAutoScrollTargetId;
  pendingAutoScrollMessageIdRef.current = pendingAutoScrollMessageId;

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== undefined) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const handlePendingAutoScrollTargetLayout = useCallback(
    (renderedMessageId: string) => {
      if (!pendingAutoScrollMessageId) return;
      if (lastHandledIntentIdRef.current === pendingAutoScrollMessageId) return;
      if (pendingAutoScrollTargetId !== renderedMessageId) return;

      if (scrollFrameRef.current !== undefined) {
        cancelAnimationFrame(scrollFrameRef.current);
      }

      scrollFrameRef.current = requestAnimationFrame(() => {
        scrollFrameRef.current = undefined;

        if (pendingAutoScrollTargetIdRef.current !== renderedMessageId) return;
        if (
          lastHandledIntentIdRef.current === pendingAutoScrollMessageIdRef.current
        ) {
          return;
        }

        callback();
        lastHandledIntentIdRef.current = pendingAutoScrollMessageIdRef.current;
      });
    },
    [callback, pendingAutoScrollMessageId, pendingAutoScrollTargetId]
  );

  return {
    pendingAutoScrollTargetId,
    handlePendingAutoScrollTargetLayout,
  };
}
