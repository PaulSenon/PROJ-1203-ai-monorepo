import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { ComponentProps } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { cn } from "@/lib/utils";
import { useMessageActions } from "./_hooks/use-message-actions";
import { useMessageRawTextReader } from "./_hooks/use-message-raw-text-reader";
import { MessageContentParts } from "./_parts/content";
import { MessageFooterUser } from "./_parts/footer/footer";

export type ChatMessageUserProps = ComponentProps<"div"> & {
  message: MyUIMessage;
};

export function ChatMessageUser({
  message,
  className,
  ...props
}: ChatMessageUserProps) {
  const readRawText = useMessageRawTextReader(message.parts);
  const { handleFooterAction } = useMessageActions({
    messageId: message.id,
    readRawText,
    role: "user",
  });

  return (
    <div
      className={cn("flex w-full flex-col items-end gap-2", className)}
      {...props}
    >
      <Message.Root className="w-fit max-w-[90%] sm:max-w-[80%]" from="user">
        <Message.Content variant="user">
          <MessageContentParts isStreaming={false} parts={message.parts} />
        </Message.Content>
        <Message.Footer>
          <MessageFooterUser
            createdAt={message.metadata?.createdAt}
            onAction={handleFooterAction}
            readEditInitialText={readRawText}
          />
        </Message.Footer>
      </Message.Root>
    </div>
  );
}
