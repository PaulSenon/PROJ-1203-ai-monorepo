import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import { type ComponentProps, memo, useMemo } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { useMessageMetadata, useMessageParts } from "@/hooks/use-message-store";
import { cn } from "@/lib/utils";
import { useMessageActions } from "./_hooks/use-message-actions";
import { MessageContentParts } from "./_parts/content";
import { MessageFooterAssistant } from "./_parts/footer/footer";
import { StatusPart } from "./_parts/status/status";

export type ChatMessageAssistantProps = ComponentProps<"div"> & {
  messageId: string;
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

  return useMemo(() => {
    if (dataSource === "cache") return "border-l border-yellow-500 p-2";
    if (dataSource === "convex-persisted") {
      return "border-l border-orange-500 p-2";
    }
    if (dataSource === "optimistic") return "border-l border-purple-500 p-2";
    if (dataSource === "http-stream") return "border-l border-green-500 p-2";
    if (dataSource === "convex-stream") return "border-l border-blue-500 p-2";
  }, [dataSource]);
}

function AssistantContentFrame({
  messageId,
  children,
}: {
  messageId: string;
  children: React.ReactNode;
}) {
  const metadata = useMessageMetadata(messageId);
  const parts = useMessageParts(messageId) ?? [];
  const showThinking = shouldShowThinking({ metadata, parts });
  // TODO: for debug purpose only, hide behind flag
  const debugClass = useMessageDatasourceDebugger(metadata);

  return (
    <Message.Content className={cn(debugClass)} variant="assistant">
      {showThinking ? <Message.Thinking /> : null}
      {children}
    </Message.Content>
  );
}

const AssistantMessagePartsContent = memo(
  function AssistantMessagePartsContent({
    messageId,
    reasoningPreviewLines,
    consolidate,
    enableCodeHighlighting,
  }: Pick<
    ChatMessageAssistantProps,
    | "messageId"
    | "reasoningPreviewLines"
    | "consolidate"
    | "enableCodeHighlighting"
  >) {
    const parts = useMessageParts(messageId) ?? [];

    return (
      <MessageContentParts
        consolidate={consolidate}
        enableCodeHighlighting={enableCodeHighlighting}
        parts={parts}
        reasoningPreviewLines={reasoningPreviewLines}
      />
    );
  }
);

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

export function ChatMessageAssistant({
  messageId,
  reasoningPreviewLines,
  className,
  consolidate,
  enableCodeHighlighting,
  ...props
}: ChatMessageAssistantProps) {
  return (
    <div
      className={cn("flex w-full flex-col items-start gap-2", className)}
      {...props}
    >
      <Message.Root className="w-full max-w-full" from="assistant">
        <AssistantContentFrame messageId={messageId}>
          <AssistantMessagePartsContent
            consolidate={consolidate}
            enableCodeHighlighting={enableCodeHighlighting}
            messageId={messageId}
            reasoningPreviewLines={reasoningPreviewLines}
          />
        </AssistantContentFrame>
        <AssistantStatusStoreItem messageId={messageId} />
        <Message.Footer>
          <AssistantFooterStoreItem messageId={messageId} />
        </Message.Footer>
      </Message.Root>
    </div>
  );
}
