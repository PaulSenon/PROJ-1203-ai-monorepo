import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { ComponentProps } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { cn } from "@/lib/utils";
import { MessageContentParts } from "./_parts/content";
import { StatusPart } from "./_parts/status";

export type ChatMessageAssistantProps = ComponentProps<"div"> & {
  message: MyUIMessage;
};

function shouldShowThinking(message: MyUIMessage) {
  const { metadata, parts } = message;

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

export function ChatMessageAssistant({
  message,
  className,
  ...props
}: ChatMessageAssistantProps) {
  const showThinking = shouldShowThinking(message);

  return (
    <div
      className={cn("flex w-full flex-col items-start gap-2", className)}
      {...props}
    >
      <Message.Root className="w-full max-w-full" from="assistant">
        <Message.Content variant="assistant">
          {showThinking ? <Message.Thinking /> : null}
          <MessageContentParts parts={message.parts} />
          <StatusPart metadata={message.metadata} />
        </Message.Content>
      </Message.Root>
    </div>
  );
}
