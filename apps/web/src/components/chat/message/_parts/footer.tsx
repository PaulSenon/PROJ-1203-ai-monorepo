import {
  type MyUIMessageMetadata,
  messageTiming,
} from "@ai-monorepo/ai/types/uiMessage";
import { type ComponentProps, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MessageFooterCopyKind = "raw"; // future: "markdown" | "raw" etc.

export type MessageFooterHandlerProps = {
  onActionCopy: (kind: MessageFooterCopyKind) => void;
  onActionRetry: (modelId?: string) => void;
};

export type MessageFooterProps = ComponentProps<"div"> &
  MessageFooterHandlerProps & {
    metadata?: MyUIMessageMetadata;
  };

export function MessageFooterUser({
  className,
  onActionCopy,
  ...props
}: MessageFooterProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-2 text-muted-foreground text-xs",
        "flex-col items-start sm:flex-row sm:items-center",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1">
        <CopyAction disabled={false} onCopy={onActionCopy} />
      </div>
    </div>
  );
}

export function MessageFooterAssistant({
  metadata,
  onActionCopy,
  onActionRetry,
  className,
  ...props
}: MessageFooterProps) {
  const modelId = metadata?.modelId;
  const outputTokens = metadata?.usage?.outputTokens;
  const tokensPerSecond = useMemo(
    () => messageTiming(metadata).tokenPerSecond,
    [metadata]
  );
  const hasStats =
    Boolean(modelId) ||
    typeof outputTokens === "number" ||
    typeof tokensPerSecond === "number";
  const isStreaming =
    metadata?.liveStatus === "pending" || metadata?.liveStatus === "streaming";

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-2 text-muted-foreground text-xs",
        "flex-col items-start sm:flex-row sm:items-center",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1">
        <CopyAction disabled={isStreaming} onCopy={onActionCopy} />
        <RetryAction disabled={isStreaming} onRetry={onActionRetry} />
      </div>
      {hasStats ? (
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground/80">
          <ModelInfo modelId={modelId} />
          <OutputTokensInfo outputTokens={outputTokens} />
          <TokensPerSecondInfo tokensPerSecond={tokensPerSecond} />
        </div>
      ) : null}
    </div>
  );
}

function CopyAction({
  onCopy,
  disabled,
}: {
  onCopy: MessageFooterHandlerProps["onActionCopy"];
  disabled: boolean;
}) {
  return (
    <Button
      className="h-7 px-2 text-xs"
      disabled={disabled}
      onClick={() => onCopy("raw")}
      size="sm"
      type="button"
      variant="ghost"
    >
      Copy
    </Button>
  );
}

function RetryAction({
  onRetry,
  disabled,
}: {
  onRetry: MessageFooterHandlerProps["onActionRetry"];
  disabled: boolean;
}) {
  return (
    <Button
      disabled={disabled}
      onClick={() => onRetry()}
      size="sm"
      type="button"
      variant="ghost"
    >
      Retry
    </Button>
  );
}

function ModelInfo({ modelId }: { modelId?: string }) {
  return modelId ? (
    <span className="font-medium text-muted-foreground">{modelId}</span>
  ) : null;
}

function OutputTokensInfo({ outputTokens }: { outputTokens?: number }) {
  return typeof outputTokens === "number" ? (
    <span>Output: {outputTokens}</span>
  ) : null;
}

function TokensPerSecondInfo({
  tokensPerSecond,
}: {
  tokensPerSecond?: number;
}) {
  return typeof tokensPerSecond === "number" ? (
    <span>{tokensPerSecond.toFixed(1)} tok/s</span>
  ) : null;
}
