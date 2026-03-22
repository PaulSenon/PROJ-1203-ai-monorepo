import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import React, { useCallback, useRef, useState } from "react";
import { Conversation } from "@/components/ui-custom/chat/conversation";
import {
  useScrollToBottomActions,
  useScrollToBottomState,
} from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";
import { useAppReadySignalAction } from "@/hooks/use-app-ready";
import { ScrollEdgeProbe } from "@/hooks/utils/use-scroll-edges";
import { cn } from "@/lib/utils";
import { MessagesList } from "./_parts/messages-list/messages-list";

export type ChatConversationLayoutProps = {
  messages: MyUIMessage[];
  isThreadSettled: boolean;
  isPending: boolean;
  pendingAutoScrollMessageId: string | undefined;
  onStartReached?: () => void;
};

function raf() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export const ChatConversationLayout = React.memo(
  function _ChatConversationLayout({
    messages,
    isThreadSettled,
    pendingAutoScrollMessageId,
    isPending,
    onStartReached,
  }: ChatConversationLayoutProps) {
    const { bottomRef } = useScrollToBottomState();
    const { scrollToBottom } = useScrollToBottomActions();
    const { ready: markReady } = useAppReadySignalAction("conversation-layout");
    const pendingAutoScrollMessageIdRef = useRef(pendingAutoScrollMessageId);
    pendingAutoScrollMessageIdRef.current = pendingAutoScrollMessageId;
    const shouldReserveLastAssistantSpace = useShouldReserveLastAssistantSpace({
      isThreadSettled,
    });

    const lastHandledIntentIdRef = useRef<string | undefined>(undefined);
    const handleLastItemKeyUpdate = useCallback(
      async (lastItemKey?: string) => {
        const pendingId = pendingAutoScrollMessageIdRef.current;

        if (pendingId === undefined) return;
        if (pendingId === lastHandledIntentIdRef.current) return;
        if (pendingId !== lastItemKey) return;

        lastHandledIntentIdRef.current = pendingId;
        await raf();
        scrollToBottom("snappy");
      },
      [scrollToBottom]
    );

    const handleReady = useCallback(async () => {
      await raf();
      scrollToBottom("instant");
      markReady();
    }, [markReady, scrollToBottom]);

    return (
      <Conversation.Root
        className={cn(
          "relative mx-auto mb-[130px] w-full max-w-3xl flex-1 p-6 md:mb-0"
        )}
      >
        <Conversation.List>
          <MessagesList
            isPending={isPending}
            messages={messages}
            onLastItemKeyUpdate={handleLastItemKeyUpdate}
            onReady={handleReady}
            onStartReached={onStartReached}
            shouldReserveLastAssistantSpace={shouldReserveLastAssistantSpace}
          />
        </Conversation.List>

        <ScrollEdgeProbe ref={bottomRef} />
      </Conversation.Root>
    );
  }
);

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
