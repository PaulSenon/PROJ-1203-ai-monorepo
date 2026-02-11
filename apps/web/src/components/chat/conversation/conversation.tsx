import {
  useActiveThreadMessages,
  useActiveThreadState,
} from "@/hooks/use-chat-active";
import { useActiveThreadUIReady } from "./_hooks/use-active-thread-ui-ready";
import { ChatConversationLayout } from "./conversation-layout";

export function ChatConversation() {
  const { messages, isPending } = useActiveThreadMessages();
  const { uuid, isThreadSettled } = useActiveThreadState();

  useActiveThreadUIReady(isPending);

  return (
    <ChatConversationLayout
      isPending={isPending}
      isThreadSettled={isThreadSettled}
      key={uuid}
      messages={messages}
      threadUuid={uuid}
    />
  );
}
