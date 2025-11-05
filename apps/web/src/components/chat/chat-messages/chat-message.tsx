import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  Message as AIElementsMessage,
  MessageContent as AIElementsMessageContent,
} from "@/components/ai-elements/message";
import { useActiveThreadActions } from "@/hooks/use-chat-active";
import { ChatMessageError } from "./chat-message-error";
import { ChatMessagePartReasoning } from "./chat-message-parts/chat-message-part-reasoning";
import { ChatMessagePartText } from "./chat-message-parts/chat-message-part-text";

export function ChatMessage({ message }: { message: MyUIMessage }) {
  const { regenerate } = useActiveThreadActions();
  return (
    <div className="flex flex-col items-start gap-2">
      <AIElementsMessage from={message.role} key={message.id}>
        <AIElementsMessageContent variant={"contained"}>
          {message.parts.map((part, i) => {
            switch (part.type) {
              case "reasoning":
                return (
                  <ChatMessagePartReasoning key={`${message.id}-${i}`}>
                    {part.text}
                  </ChatMessagePartReasoning>
                );
              case "text": // we don't use any reasoning or tool calls in this example
                return (
                  <ChatMessagePartText key={`${message.id}-${i}`}>
                    {part.text}
                  </ChatMessagePartText>
                );
              default:
                return null;
            }
          })}
          {message.metadata?.error ? (
            <ChatMessageError
              errorMetadata={message.metadata.error}
              onRetry={() => regenerate(message.id)}
            />
          ) : null}
        </AIElementsMessageContent>
        {/* <Actions>
          <Action onClick={() => regenerate(message.id)} tooltip="Regenerate">
            <RefreshCwIcon />
          </Action>
        </Actions> */}
      </AIElementsMessage>
      {message.role === "assistant" && (
        <span className="text-gray-500 text-sm">
          {message.metadata?.modelId}
        </span>
      )}
    </div>
  );
}
