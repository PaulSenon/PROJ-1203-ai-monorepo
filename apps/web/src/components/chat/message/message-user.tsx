import type { ComponentProps } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { useMessageMetadata, useMessageParts } from "@/hooks/use-message-store";
import { cn } from "@/lib/utils";
import { useMessageActions } from "./_hooks/use-message-actions";
import { useMessageRawTextReader } from "./_hooks/use-message-raw-text-reader";
import { MessageContentParts } from "./_parts/content";
import { MessageFooterUser } from "./_parts/footer/footer";

export type ChatMessageUserProps = ComponentProps<"div"> & {
  messageId: string;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
};

export function ChatMessageUser({
  messageId,
  className,
  consolidate,
  enableCodeHighlighting,
  ...props
}: ChatMessageUserProps) {
  const parts = useMessageParts(messageId) ?? [];
  const metadata = useMessageMetadata(messageId);
  const readRawText = useMessageRawTextReader(messageId);
  const { handleFooterAction } = useMessageActions({
    messageId,
    role: "user",
  });

  return (
    <div
      className={cn("flex w-full flex-col items-end gap-2", className)}
      {...props}
    >
      <Message.Root className="w-fit max-w-[90%] sm:max-w-[80%]" from="user">
        <Message.Content variant="user">
          <MessageContentParts
            consolidate={consolidate}
            enableCodeHighlighting={enableCodeHighlighting}
            parts={parts}
          />
        </Message.Content>
        <Message.Footer>
          <MessageFooterUser
            createdAt={metadata?.createdAt}
            messageId={messageId}
            onAction={handleFooterAction}
            readEditInitialText={readRawText}
          />
        </Message.Footer>
      </Message.Root>
    </div>
  );
}
