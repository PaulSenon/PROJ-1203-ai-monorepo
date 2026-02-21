import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useCallback, useLayoutEffect, useState } from "react";
import { Conversation } from "@/components/ui-custom/chat/conversation";
import { ScrollEdgeProbe } from "@/hooks/utils/use-scroll-edges";
import { useScrollToBottomState } from "../../ui-custom/chat/hooks/use-scroll-to-bottom";
import { ConversationMessagesList } from "./_parts/messages-list";

export type ChatConversationLayoutProps = {
  messages: MyUIMessage[];
  isPending: boolean;
  isThreadSettled: boolean;
  pendingAutoScrollMessageId?: string;
  threadUuid: string;
  onLoadOlder?: () => void;
};

export function ChatConversationLayout({
  messages,
  isPending,
  isThreadSettled,
  pendingAutoScrollMessageId,
  threadUuid,
  onLoadOlder,
}: ChatConversationLayoutProps) {
  const { bottomRef } = useScrollToBottomState();
  const initialScroll = !isPending && messages.length > 0;
  const [bootRequestKey, setBootRequestKey] = useState<string | undefined>(
    undefined
  );
  const [isConversationVisible, setIsConversationVisible] = useState(true);
  const shouldReserveLastAssistantSpace = useShouldReserveLastAssistantSpace({
    isThreadSettled,
  });

  useLayoutEffect(() => {
    if (!initialScroll) {
      setBootRequestKey(undefined);
      setIsConversationVisible(true);
      return;
    }

    setBootRequestKey(threadUuid);
    setIsConversationVisible(false);
  }, [initialScroll, threadUuid]);

  const handleBootAnchored = useCallback((resolvedKey: string) => {
    setBootRequestKey((current) => {
      if (current !== resolvedKey) return current;
      setIsConversationVisible(true);
      return undefined;
    });
  }, []);

  return (
    <Conversation.Root className="relative mx-auto w-full max-w-3xl flex-1 p-6">
      <Conversation.List
        className={isConversationVisible ? undefined : "opacity-0"}
      >
        <ConversationMessagesList
          bootRequestKey={bootRequestKey}
          messages={messages}
          onBootAnchored={handleBootAnchored}
          onLoadOlder={onLoadOlder}
          pendingAutoScrollMessageId={pendingAutoScrollMessageId}
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
