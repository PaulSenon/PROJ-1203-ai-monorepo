import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { ComponentProps } from "react";
import { ChatMessageAssistant } from "./message-assistant";
import { ChatMessageUser } from "./message-user";

export type ChatMessageProps = ComponentProps<"div"> & {
  message: MyUIMessage;
};

export function ChatMessage({ message, ...props }: ChatMessageProps) {
  if (message.role === "user") {
    return <ChatMessageUser message={message} {...props} />;
  }

  if (message.role === "assistant") {
    return <ChatMessageAssistant message={message} {...props} />;
  }

  return null;
}
