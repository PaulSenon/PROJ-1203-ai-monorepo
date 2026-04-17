import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { type ComponentProps, memo } from "react";
import { useMessageRole } from "@/hooks/use-message-store";
import {
  ChatMessageAssistant,
  ChatMessageAssistantStoreItem,
} from "./message-assistant";
import { ChatMessageUser, ChatMessageUserStoreItem } from "./message-user";

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

export type ChatMessageStoreItemProps = Omit<ChatMessageProps, "message"> & {
  messageId: string;
};

export function ChatMessageStoreItem({
  messageId,
  reasoningPreviewLines,
  consolidate,
  enableCodeHighlighting,
  ...props
}: ChatMessageStoreItemProps) {
  const role = useMessageRole(messageId);

  if (role === "user") {
    return (
      <ChatMessageUserStoreItem
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
      <ChatMessageAssistantStoreItem
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
}
