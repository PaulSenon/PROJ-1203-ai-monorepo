import { type ComponentProps, memo } from "react";
import { cn } from "@/lib/utils";
import { CopyAction, RetryAction } from "./_parts/footer-actions";
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
        <RetryAction disabled={isStreaming} onAction={onAction} />
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
  readEditInitialText: () => string;
  onAction: MessageFooterActionHandler;
  messageId: string;
};

export const MessageFooterUser = memo(function _MessageFooterUser({
  createdAt,
  readEditInitialText,
  className,
  onAction,
  messageId,
  ...props
}: MessageFooterUserProps) {
  // const [isEditing, setIsEditing] = useState(false);
  // const [editSeed, setEditSeed] = useState("");

  // const handleStartEditing = useCallback(() => {
  //   setEditSeed(readEditInitialText());
  //   setIsEditing(true);
  // }, [readEditInitialText]);

  // const handleCancelEditing = useCallback(() => {
  //   setIsEditing(false);
  // }, []);

  // const handleSaveEdit = useCallback(
  //   (text: string) => {
  //     onAction({ type: "edit-retry", text });
  //     setIsEditing(false);
  //   },
  //   [onAction]
  // );

  return (
    <div className={cn(ROOT_CLASSNAME, className)} {...props}>
      {/* {isEditing ? (
        <UserFooterInlineEditor
          className="w-full max-w-sm"
          initialText={editSeed}
          onCancel={handleCancelEditing}
          onSave={handleSaveEdit}
        />
      ) : ( */}
      <div className="flex items-center gap-1">
        <CopyAction onAction={onAction} />
        {/* <EditAction onClick={handleStartEditing} /> */}
      </div>
      {/* )} */}
      <div className="flex items-center gap-2 text-muted-foreground/80">
        <CreatedAtInfo createdAt={createdAt} />
        <DebugMessageId messageId={messageId} />
      </div>
    </div>
  );
});
