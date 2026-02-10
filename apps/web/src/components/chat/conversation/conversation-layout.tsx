import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { Conversation } from "@/components/ui-custom/chat/conversation";
import { ScrollEdgeProbe } from "@/hooks/utils/use-scroll-edges";
import { useScrollToBottomState } from "../../ui-custom/chat/hooks/use-scroll-to-bottom";
import { InitialScroll } from "./_parts/initial-scroll";
import { ConversationMessagesList } from "./_parts/messages-list";

export type ChatConversationLayoutProps = {
  messages: MyUIMessage[];
  isPending: boolean;
  threadUuid: string;
};

export function ChatConversationLayout({
  messages,
  isPending,
  threadUuid,
}: ChatConversationLayoutProps) {
  const { bottomRef } = useScrollToBottomState();
  const initialScroll = !isPending && messages.length > 0;

  return (
    <Conversation.Root className="relative mx-auto w-full max-w-2xl flex-1 p-6">
      <Conversation.List>
        <ConversationMessagesList messages={messages} />
      </Conversation.List>

      <ScrollEdgeProbe ref={bottomRef} />
      {initialScroll ? <InitialScroll key={threadUuid} /> : null}
    </Conversation.Root>
  );
}
