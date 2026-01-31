import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { ComponentProps } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { cn } from "@/lib/utils";
import { MessageContentParts } from "./_parts/content";

export type ChatMessageUserProps = ComponentProps<"div"> & {
  message: MyUIMessage;
};

export function ChatMessageUser({
  message,
  className,
  ...props
}: ChatMessageUserProps) {
  return (
    <div
      className={cn("flex w-full flex-col items-end gap-2", className)}
      {...props}
    >
      <Message.Root className="w-full max-w-[90%] sm:max-w-[80%]" from="user">
        <Message.Content variant="user">
          <MessageContentParts parts={message.parts} />
        </Message.Content>
      </Message.Root>
    </div>
  );
}
