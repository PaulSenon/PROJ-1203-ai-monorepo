import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { RefreshCwIcon } from "lucide-react";
import { Action, Actions } from "@/components/ai-elements/actions";
import {
  Message as AIElementsMessage,
  MessageContent as AIElementsMessageContent,
} from "@/components/ai-elements/message";
import { useActiveThreadActions } from "@/hooks/use-chat-active";
import { useChatInputState } from "@/hooks/use-chat-input";
import { ChatMessageError } from "./chat-message-error";
import { ChatMessagePartReasoning } from "./chat-message-parts/chat-message-part-reasoning";
import { ChatMessagePartText } from "./chat-message-parts/chat-message-part-text";

export function ChatMessage({ message }: { message: MyUIMessage }) {
  const { regenerate } = useActiveThreadActions();
  const { selectedModelId } = useChatInputState(); // TODO: tmp while not "retry with model" feature
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
              onRetry={() => regenerate(message.id, { selectedModelId })}
            />
          ) : null}
        </AIElementsMessageContent>
        {/* TODO: tmp for debug purpose UI is fully broken. */}
        <Actions>
          <Action
            onClick={() => regenerate(message.id, { selectedModelId })}
            tooltip="Regenerate"
          >
            <RefreshCwIcon />
          </Action>
        </Actions>
      </AIElementsMessage>
      {/* TODO: tmp for debug purpose UI is fully broken. */}
      <span className="text-gray-500 text-sm">{message.id}</span>
      {message.role === "assistant" && (
        <span className="text-gray-500 text-sm">
          {message.metadata?.modelId}
        </span>
      )}
    </div>
  );
}
