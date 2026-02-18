import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { type ComponentProps, memo } from "react";
import { ChatMessageAssistant } from "./message-assistant";
import { ChatMessageUser } from "./message-user";

export type ChatMessageProps = ComponentProps<"div"> & {
  message: MyUIMessage;
  reasoningPreviewLines?: number;
  consolidate?: boolean;
};

export const ChatMessage = memo(function _ChatMessage({
  message,
  reasoningPreviewLines,
  consolidate,
  ...props
}: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <ChatMessageUser consolidate={consolidate} message={message} {...props} />
    );
  }

  if (message.role === "assistant") {
    return (
      <ChatMessageAssistant
        consolidate={consolidate}
        message={message}
        reasoningPreviewLines={reasoningPreviewLines}
        {...props}
      />
    );
  }

  return null;
});
