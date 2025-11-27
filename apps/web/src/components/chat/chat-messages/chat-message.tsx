import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { RefreshCwIcon } from "lucide-react";
import { type ComponentProps, useCallback } from "react";
import {
  Message as AIElementsMessage,
  MessageContent as AIElementsMessageContent,
  MessageAction,
  MessageActions,
} from "@/components/ai-elements/message";
import { useActiveThreadActions } from "@/hooks/use-chat-active";
import { useModelSelectorState } from "@/hooks/use-user-preferences";
import { cn } from "@/lib/utils";
import { ChatMessageError } from "./chat-message-error";
import { ChatMessagePartReasoning } from "./chat-message-parts/chat-message-part-reasoning";
import { ChatMessagePartText } from "./chat-message-parts/chat-message-part-text";

export function ChatMessage({
  message,
  ...props
}: { message: MyUIMessage } & ComponentProps<"div">) {
  const { regenerate } = useActiveThreadActions();
  const { selectedModelId } = useModelSelectorState(); // TODO: tmp while not "retry with model" feature

  const handleRegenerate = useCallback(() => {
    regenerate(message.id, { selectedModelId });
  }, [regenerate, message.id, selectedModelId]);

  const source = (message.metadata as Record<string, unknown>)
    ?.dataSource as string;
  return (
    <div className="flex flex-col items-start gap-2" {...props}>
      <AIElementsMessage
        className={cn(
          message.metadata?.lifecycleState === "deleted" ? "bg-red-500" : "",
          source === "http-stream" ? "bg-green-500" : "",
          source === "convex-stream" ? "bg-blue-500" : "",
          source === "convex-persisted" ? "bg-orange-500" : "",
          source === "optimistic" ? "bg-purple-500" : ""
        )}
        from={message.role}
        key={message.id}
      >
        <AIElementsMessageContent>
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
              onRetry={handleRegenerate}
            />
          ) : null}
        </AIElementsMessageContent>
        {/* TODO: tmp for debug purpose UI is fully broken. */}
        <MessageActions>
          <MessageAction onClick={handleRegenerate} tooltip="Regenerate">
            <RefreshCwIcon />
          </MessageAction>
        </MessageActions>
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
