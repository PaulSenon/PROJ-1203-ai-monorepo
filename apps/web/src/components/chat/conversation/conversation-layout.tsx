import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useState } from "react";
import { Conversation } from "@/components/ui-custom/chat/conversation";
import { ScrollEdgeProbe } from "@/hooks/utils/use-scroll-edges";
import { useScrollToBottomState } from "../../ui-custom/chat/hooks/use-scroll-to-bottom";
import { InitialScroll } from "./_parts/initial-scroll";
import { ConversationMessagesList } from "./_parts/messages-list";

export type ChatConversationLayoutProps = {
  messages: MyUIMessage[];
  isPending: boolean;
  isThreadSettled: boolean;
  threadUuid: string;
  useWindowVirtualization?: boolean;
};

export function ChatConversationLayout({
  messages,
  isPending,
  isThreadSettled,
  threadUuid,
  useWindowVirtualization = true,
}: ChatConversationLayoutProps) {
  const { bottomRef } = useScrollToBottomState();
  const initialScroll = !isPending && messages.length > 0;
  const shouldReserveLastAssistantSpace = useShouldReserveLastAssistantSpace({
    isThreadSettled,
  });

  return (
    <Conversation.Root className="relative mx-auto w-full max-w-3xl flex-1 p-6">
      <Conversation.List>
        <ConversationMessagesList
          messages={messages}
          shouldReserveLastAssistantSpace={shouldReserveLastAssistantSpace}
          useWindowVirtualization={useWindowVirtualization}
        />
      </Conversation.List>

      <ScrollEdgeProbe ref={bottomRef} />
      {initialScroll ? <InitialScroll key={threadUuid} /> : null}
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
