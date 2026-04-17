import { type ComponentProps, memo } from "react";
import { useMessageRole } from "@/hooks/use-message-store";
import { ChatMessageAssistant } from "./message-assistant";
import { ChatMessageUser } from "./message-user";

export type ChatMessageProps = ComponentProps<"div"> & {
  messageId: string;
  reasoningPreviewLines?: number;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
};

export const ChatMessage = memo(function _ChatMessage({
  messageId,
  reasoningPreviewLines,
  consolidate,
  enableCodeHighlighting,
  ...props
}: ChatMessageProps) {
  const role = useMessageRole(messageId);

  if (role === "user") {
    return (
      <ChatMessageUser
        consolidate={consolidate}
        data-msg-id={messageId}
        enableCodeHighlighting={enableCodeHighlighting}
        messageId={messageId}
        {...props}
      />
    );
  }

  if (role === "assistant") {
    return (
      <ChatMessageAssistant
        consolidate={consolidate}
        data-msg-id={messageId}
        enableCodeHighlighting={enableCodeHighlighting}
        messageId={messageId}
        reasoningPreviewLines={reasoningPreviewLines}
        {...props}
      />
    );
  }

  return null;
});
