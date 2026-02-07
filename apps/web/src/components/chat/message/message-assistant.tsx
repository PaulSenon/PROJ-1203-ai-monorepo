import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import { type ComponentProps, useMemo } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import type { MyUIMessageMetadataWithSource } from "@/hooks/use-messages";
import { cn } from "@/lib/utils";
import { useMessageActions } from "./_hooks/use-message-actions";
import { MessageContentParts } from "./_parts/content";
import { MessageFooterAssistant } from "./_parts/footer";
import { StatusPart } from "./_parts/status";

export type ChatMessageAssistantProps = ComponentProps<"div"> & {
  message: MyUIMessage;
  reasoningPreviewLines?: number;
};

function shouldShowThinking(message: MyUIMessage) {
  const { metadata, parts } = message;

  // fast check for obviously hidden state
  // (try avoiding checking the parts for performances)
  if (
    metadata?.liveStatus === "completed" ||
    metadata?.liveStatus === "cancelled" ||
    metadata?.liveStatus === "error" ||
    metadata?.error !== undefined
  ) {
    return false;
  }

  // fast check for obviously visible state
  // (try avoiding checking the parts for performances)
  if (metadata?.liveStatus === "pending") {
    return true;
  }

  // slow check for ambiguous state requiring parts check
  for (const part of parts) {
    // hide if any non empty text part
    if (part.type === "text" && part.text?.trim().length > 0) {
      return false;
    }

    // hide if any reasoning part (empty or not)
    if (part.type === "reasoning") {
      return false;
    }
  }
  return true;
}

function useMessageDatasourceDebugger(metadata?: MyUIMessageMetadata) {
  const dataSource = (metadata as MyUIMessageMetadataWithSource | undefined)
    ?.dataSource;

  const className = useMemo(() => {
    if (dataSource === "cache") return "border border-yellow-500 p-2";
    if (dataSource === "convex-persisted")
      return "border border-orange-500 p-2";
    if (dataSource === "optimistic") return "border border-purple-500 p-2";
    if (dataSource === "http-stream") return "border border-green-500 p-2";
    if (dataSource === "convex-stream") return "border border-blue-500 p-2";
  }, [dataSource]);

  return className;
}

export function ChatMessageAssistant({
  message,
  reasoningPreviewLines,
  className,
  ...props
}: ChatMessageAssistantProps) {
  const showThinking = shouldShowThinking(message);
  const { handleCopy, handleRetry, handleStatusAction } = useMessageActions({
    messageId: message.id,
    role: "assistant",
  });

  // TODO: for debug purpose only, hide behind flag
  const debugClass = useMessageDatasourceDebugger(message.metadata);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-2",
        debugClass,
        className
      )}
      {...props}
    >
      <Message.Root className="w-full max-w-full" from="assistant">
        <Message.Content variant="assistant">
          {showThinking ? <Message.Thinking /> : null}
          <MessageContentParts
            parts={message.parts}
            reasoningPreviewLines={reasoningPreviewLines}
          />
          <StatusPart
            metadata={message.metadata}
            onAction={handleStatusAction}
          />
        </Message.Content>
        <Message.Footer>
          <MessageFooterAssistant
            metadata={message.metadata}
            onActionCopy={handleCopy}
            onActionRetry={handleRetry}
          />
        </Message.Footer>
      </Message.Root>
    </div>
  );
}
