import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { ComponentProps } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { cn } from "@/lib/utils";
import { MessageContentParts } from "./_parts/content";
import type { MessageFooterHandlerProps } from "./_parts/footer";
import { MessageFooterUser } from "./_parts/footer";

export type ChatMessageUserProps = ComponentProps<"div"> & {
  message: MyUIMessage;
};

export function ChatMessageUser({
  message,
  className,
  ...props
}: ChatMessageUserProps) {
  const handleCopy: MessageFooterHandlerProps["onActionCopy"] = (kind) => {
    // TODO: implement
    console.log("handleCopy", { kind });
  };

  const handleRetry: MessageFooterHandlerProps["onActionRetry"] = (modelId) => {
    // TODO: implement
    console.log("handleRetry", { modelId });
  };

  return (
    <div
      className={cn("flex w-full flex-col items-end gap-2", className)}
      {...props}
    >
      <Message.Root className="w-fit max-w-[90%] sm:max-w-[80%]" from="user">
        <Message.Content variant="user">
          <MessageContentParts parts={message.parts} />
        </Message.Content>
        <Message.Footer>
          <MessageFooterUser
            onActionCopy={handleCopy}
            onActionRetry={handleRetry}
          />
        </Message.Footer>
      </Message.Root>
    </div>
  );
}
