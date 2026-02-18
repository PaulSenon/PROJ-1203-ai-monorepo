import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { ChatMessage } from "@/components/chat/message/message";
import { cn } from "@/lib/utils";

export type ConversationMessagesListProps = {
  messages: MyUIMessage[];
  shouldReserveLastAssistantSpace: boolean;
};

export function ConversationMessagesList({
  messages,
  shouldReserveLastAssistantSpace,
}: ConversationMessagesListProps) {
  return messages.map((message, index) => {
    const isLast = index === messages.length - 1;
    const isAssistant = message.role === "assistant";
    const isDynamic = isLast && shouldReserveLastAssistantSpace;

    return (
      <ChatMessage
        className={cn(
          isAssistant &&
            shouldReserveLastAssistantSpace &&
            "last:min-h-[calc(100vh-20rem)]"
        )}
        consolidate={!isDynamic}
        key={message.id}
        message={message}
      />
    );
  });
}
