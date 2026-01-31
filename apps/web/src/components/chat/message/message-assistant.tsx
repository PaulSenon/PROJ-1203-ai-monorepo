import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { ComponentProps } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { cn } from "@/lib/utils";
import { MessageContentParts } from "./_parts/content";

export type ChatMessageAssistantProps = ComponentProps<"div"> & {
  message: MyUIMessage;
};

function hasContentParts(parts: MyUIMessage["parts"]) {
  return parts.some((part) => {
    if (part.type === "text" || part.type === "reasoning") {
      return Boolean(part.text?.trim());
    }

    return false;
  });
}

export function ChatMessageAssistant({
  message,
  className,
  ...props
}: ChatMessageAssistantProps) {
  const showThinking = !hasContentParts(message.parts);

  return (
    <div
      className={cn("flex w-full flex-col items-start gap-2", className)}
      {...props}
    >
      <Message.Root className="w-full max-w-full" from="assistant">
        <Message.Content variant="assistant">
          {showThinking ? <Message.Thinking /> : null}
          <MessageContentParts parts={message.parts} />
        </Message.Content>
      </Message.Root>
    </div>
  );
}
