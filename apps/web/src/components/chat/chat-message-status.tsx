import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  ChatMessageCancelledBlock,
  ChatMessageErrorBlock,
} from "@/components/ui-custom/chat/message-status";

export type ChatMessageStatusAdapterProps = {
  message: MyUIMessage;
  onRetry?: (message: MyUIMessage) => void;
  onRetryWithModel?: (message: MyUIMessage) => void;
  onContinue?: (message: MyUIMessage) => void;
  locale?: "en" | "fr";
  className?: string;
};

export function ChatMessageStatusAdapter({
  message,
  onRetry,
  onRetryWithModel,
  onContinue,
  locale,
  className,
}: ChatMessageStatusAdapterProps) {
  const isCancelled = message.metadata?.liveStatus === "cancelled";
  const isError =
    message.metadata?.liveStatus === "error" || !!message.metadata?.error;

  if (isCancelled) {
    return (
      <ChatMessageCancelledBlock
        className={className}
        locale={locale}
        onContinue={onContinue ? () => onContinue(message) : undefined}
        onRetryWithModel={
          onRetryWithModel ? () => onRetryWithModel(message) : undefined
        }
      />
    );
  }

  if (!isError) return null;

  return (
    <ChatMessageErrorBlock
      className={className}
      errorMetadata={message.metadata?.error}
      locale={locale}
      onRetry={onRetry ? () => onRetry(message) : undefined}
      onRetryWithModel={
        onRetryWithModel ? () => onRetryWithModel(message) : undefined
      }
    />
  );
}
