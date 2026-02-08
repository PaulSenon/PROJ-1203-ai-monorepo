import { Conversation } from "@/components/ui-custom/chat/conversation";
import {
  useActiveThreadMessages,
  useActiveThreadState,
} from "@/hooks/use-chat-active";
import { ScrollEdgeProbe } from "@/hooks/utils/use-scroll-edges";
import { useScrollToBottomState } from "../../ui-custom/chat/hooks/use-scroll-to-bottom";
import { useActiveThreadUIReady } from "./_hooks/use-active-thread-ui-ready";
import { InitialScroll } from "./_parts/initial-scroll";
import { ConversationMessagesList } from "./_parts/messages-list";

export function ChatConversation() {
  const { messages, isPending } = useActiveThreadMessages();
  const { uuid } = useActiveThreadState();
  const { bottomRef } = useScrollToBottomState();

  useActiveThreadUIReady(isPending);

  const initialScroll = !isPending && messages.length > 0;

  return (
    <Conversation.Root className="relative mx-auto w-full max-w-2xl flex-1 p-6">
      <Conversation.List>
        <ConversationMessagesList messages={messages} />
      </Conversation.List>

      <ScrollEdgeProbe ref={bottomRef} />
      {initialScroll ? <InitialScroll key={uuid} /> : null}
    </Conversation.Root>
  );
}
