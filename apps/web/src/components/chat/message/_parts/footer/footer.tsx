import { type ComponentProps, memo } from "react";
import { cn } from "@/lib/utils";
import { CopyAction } from "./_parts/footer-actions";
import {
  CreatedAtInfo,
  DebugMessageId,
  ModelInfo,
  SpeedInfo,
} from "./_parts/footer-infos";
import type { MessageFooterActionHandler } from "./footer.types";

const ROOT_CLASSNAME =
  "flex w-full flex-wrap items-center gap-2 text-muted-foreground text-xs";

export type MessageFooterAssistantProps = ComponentProps<"div"> & {
  isStreaming: boolean;
  modelId?: string;
  mockedTokensPerSecond?: number;
  onAction: MessageFooterActionHandler;
  messageId?: string;
};

export const MessageFooterAssistant = memo(function _MessageFooterAssistant({
  isStreaming,
  modelId,
  mockedTokensPerSecond,
  className,
  onAction,
  messageId,
  ...props
}: MessageFooterAssistantProps) {
  return (
    <div className={cn(ROOT_CLASSNAME, className)} {...props}>
      <div className="flex items-center gap-1">
        <CopyAction disabled={isStreaming} onAction={onAction} />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground/80">
        <ModelInfo modelId={modelId} />
        <SpeedInfo mockedTokensPerSecond={mockedTokensPerSecond} />
        <DebugMessageId messageId={messageId} />
      </div>
    </div>
  );
});

export type MessageFooterUserProps = ComponentProps<"div"> & {
  createdAt?: number;
  onAction: MessageFooterActionHandler;
  messageId: string;
};

export const MessageFooterUser = memo(function _MessageFooterUser({
  createdAt,
  className,
  onAction,
  messageId,
  ...props
}: MessageFooterUserProps) {
  return (
    <div className={cn(ROOT_CLASSNAME, className)} {...props}>
      <div className="flex items-center gap-1">
        <CopyAction onAction={onAction} />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground/80">
        <CreatedAtInfo createdAt={createdAt} />
        <DebugMessageId messageId={messageId} />
      </div>
    </div>
  );
});
