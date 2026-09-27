import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { type ComponentProps, memo } from "react";
import { ChatMessageAssistant } from "./message-assistant";
import { ChatMessageUser } from "./message-user";

export type ChatMessageProps = ComponentProps<"div"> & {
  message: MyUIMessage;
  reasoningPreviewLines?: number;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
};

export const ChatMessage = memo(function _ChatMessage({
  message,
  reasoningPreviewLines,
  consolidate,
  enableCodeHighlighting,
  ...props
}: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <ChatMessageUser
        consolidate={consolidate}
        data-msg-id={message.id}
        enableCodeHighlighting={enableCodeHighlighting}
        message={message}
        {...props}
      />
    );
  }

  if (message.role === "assistant") {
    return (
      <ChatMessageAssistant
        consolidate={consolidate}
        data-msg-id={message.id}
        enableCodeHighlighting={enableCodeHighlighting}
        message={message}
        reasoningPreviewLines={reasoningPreviewLines}
        {...props}
      />
    );
  }

  return null;
});
