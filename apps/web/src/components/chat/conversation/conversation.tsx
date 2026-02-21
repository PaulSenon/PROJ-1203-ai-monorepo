import { useActiveThreadState } from "@/hooks/use-chat-active";
import { useActiveThreadUIReady } from "./_hooks/use-active-thread-ui-ready";
import { useConversationDisplayMessages } from "./_hooks/use-conversation-display-messages";
import { ChatConversationLayout } from "./conversation-layout";

export function ChatConversation() {
  const { uuid, isThreadSettled, isDataPending, pendingAutoScrollMessageId } =
    useActiveThreadState();
  const messages = useConversationDisplayMessages();

  useActiveThreadUIReady(isDataPending);

  return (
    <ChatConversationLayout
      isPending={isDataPending}
      isThreadSettled={isThreadSettled}
      key={uuid}
      messages={messages}
      pendingAutoScrollMessageId={pendingAutoScrollMessageId}
      threadUuid={uuid}
    />
  );
}
