import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import { type ComponentProps, useMemo } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { useMessageMetadata, useMessageParts } from "@/hooks/use-message-store";
import { cn } from "@/lib/utils";
import { useMessageActions } from "./_hooks/use-message-actions";
import { MessageContentParts } from "./_parts/content";
import { MessageFooterAssistant } from "./_parts/footer/footer";
import { StatusPart } from "./_parts/status/status";

export type ChatMessageAssistantProps = ComponentProps<"div"> & {
  message: MyUIMessage;
  reasoningPreviewLines?: number;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
};

function shouldShowThinking({
  metadata,
  parts,
}: {
  metadata?: MyUIMessageMetadata;
  parts: MyUIMessage["parts"];
}) {
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
  const showThinking = shouldShowThinking({
    metadata: message.metadata,
    parts: message.parts,
  });
  const { handleFooterAction, handleStatusAction } = useMessageActions({
    messageId: message.id,
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

export type ChatMessageAssistantStoreItemProps = Omit<
  ChatMessageAssistantProps,
  "message"
> & {
  messageId: string;
};

function AssistantContentStoreItem({
  messageId,
  reasoningPreviewLines,
  consolidate,
  enableCodeHighlighting,
}: Pick<
  ChatMessageAssistantStoreItemProps,
  | "messageId"
  | "reasoningPreviewLines"
  | "consolidate"
  | "enableCodeHighlighting"
>) {
  const metadata = useMessageMetadata(messageId);
  const parts = useMessageParts(messageId) ?? [];
  const showThinking = shouldShowThinking({ metadata, parts });
  const debugClass = useMessageDatasourceDebugger(metadata);

  return (
    <Message.Content className={cn(debugClass)} variant="assistant">
      {showThinking ? <Message.Thinking /> : null}
      <MessageContentParts
        consolidate={consolidate}
        enableCodeHighlighting={enableCodeHighlighting}
        parts={parts}
        reasoningPreviewLines={reasoningPreviewLines}
      />
    </Message.Content>
  );
}

function AssistantStatusStoreItem({ messageId }: { messageId: string }) {
  const metadata = useMessageMetadata(messageId);
  const { handleStatusAction } = useMessageActions({
    messageId,
    role: "assistant",
  });

  return <StatusPart metadata={metadata} onAction={handleStatusAction} />;
}

function AssistantFooterStoreItem({ messageId }: { messageId: string }) {
  const metadata = useMessageMetadata(messageId);
  const { handleFooterAction } = useMessageActions({
    messageId,
    role: "assistant",
  });
  const isStreaming =
    metadata?.liveStatus === "pending" || metadata?.liveStatus === "streaming";

  return (
    <MessageFooterAssistant
      isStreaming={isStreaming}
      messageId={messageId}
      modelId={metadata?.modelId}
      onAction={handleFooterAction}
    />
  );
}

export function ChatMessageAssistantStoreItem({
  messageId,
  reasoningPreviewLines,
  className,
  consolidate,
  enableCodeHighlighting,
  ...props
}: ChatMessageAssistantStoreItemProps) {
  return (
    <div
      className={cn("flex w-full flex-col items-start gap-2", className)}
      {...props}
    >
      <Message.Root className="w-full max-w-full" from="assistant">
        <AssistantContentStoreItem
          consolidate={consolidate}
          enableCodeHighlighting={enableCodeHighlighting}
          messageId={messageId}
          reasoningPreviewLines={reasoningPreviewLines}
        />
        <AssistantStatusStoreItem messageId={messageId} />
        <Message.Footer>
          <AssistantFooterStoreItem messageId={messageId} />
        </Message.Footer>
      </Message.Root>
    </div>
  );
}
