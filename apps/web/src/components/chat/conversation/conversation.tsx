import {
  useActiveThreadMessages,
  useActiveThreadState,
} from "@/hooks/use-chat-active";
import { useActiveThreadUIReady } from "./_hooks/use-active-thread-ui-ready";
import { ChatConversationLayout } from "./conversation-layout";

export function ChatConversation() {
  const { messages, isPending } = useActiveThreadMessages();
  const { uuid, hasSubmittedInActiveThread, isThreadSettled } =
    useActiveThreadState();
  const shouldReserveLastAssistantSpace =
    hasSubmittedInActiveThread || !isThreadSettled;

  useActiveThreadUIReady(isPending);

  return (
    <ChatConversationLayout
      isPending={isPending}
      messages={messages}
      shouldReserveLastAssistantSpace={shouldReserveLastAssistantSpace}
      threadUuid={uuid}
    />
  );
}
