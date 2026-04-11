import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import { type ComponentProps, useMemo } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { cn } from "@/lib/utils";
import { useMessageActions } from "./_hooks/use-message-actions";
import { useMessageRawTextReader } from "./_hooks/use-message-raw-text-reader";
import { MessageContentParts } from "./_parts/content";
import { MessageFooterAssistant } from "./_parts/footer/footer";
import { StatusPart } from "./_parts/status/status";

export type ChatMessageAssistantProps = ComponentProps<"div"> & {
  message: MyUIMessage;
  reasoningPreviewLines?: number;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
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
  const dataSource = metadata?.debug?.dataSource;

  const className = useMemo(() => {
    if (dataSource === "cache") return "border-l border-yellow-500 p-2";
    if (dataSource === "convex-persisted")
      return "border-l border-orange-500 p-2";
    if (dataSource === "optimistic") return "border-l border-purple-500 p-2";
    if (dataSource === "http-stream") return "border-l border-green-500 p-2";
    if (dataSource === "convex-stream") return "border-l border-blue-500 p-2";
  }, [dataSource]);

  return className;
}

export function ChatMessageAssistant({
  message,
  reasoningPreviewLines,
  className,
  consolidate,
  enableCodeHighlighting,
  ...props
}: ChatMessageAssistantProps) {
  const showThinking = shouldShowThinking(message);
  const readRawText = useMessageRawTextReader(message.parts);
  const { handleFooterAction, handleStatusAction } = useMessageActions({
    messageId: message.id,
    readRawText,
    role: "assistant",
  });
  const isStreaming =
    message.metadata?.liveStatus === "pending" ||
    message.metadata?.liveStatus === "streaming";

  // TODO: for debug purpose only, hide behind flag
  const debugClass = useMessageDatasourceDebugger(message.metadata);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-2",

        className
      )}
      {...props}
    >
      <Message.Root className="w-full max-w-full" from="assistant">
        <Message.Content className={cn(debugClass)} variant="assistant">
          {showThinking ? <Message.Thinking /> : null}
          <MessageContentParts
            metadata={message.metadata}
            consolidate={consolidate}
            enableCodeHighlighting={enableCodeHighlighting}
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
            isStreaming={isStreaming}
            messageId={message.id}
            modelId={message.metadata?.modelId}
            onAction={handleFooterAction}
          />
        </Message.Footer>
      </Message.Root>
    </div>
  );
}
