import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { ChatMessage } from "@/components/chat/message/message";

export type ConversationMessagesListProps = {
  messages: MyUIMessage[];
};

export function ConversationMessagesList({
  messages,
}: ConversationMessagesListProps) {
  return (
    <>
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </>
  );
}
