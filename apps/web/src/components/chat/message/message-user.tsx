import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { ComponentProps } from "react";
import { Message } from "@/components/ui-custom/chat/message";
import { useMessageMetadata, useMessageParts } from "@/hooks/use-message-store";
import { cn } from "@/lib/utils";
import { useMessageActions } from "./_hooks/use-message-actions";
import {
  extractRawTextFromMessageParts,
  useMessageRawTextReader,
} from "./_hooks/use-message-raw-text-reader";
import { MessageContentParts } from "./_parts/content";
import { MessageFooterUser } from "./_parts/footer/footer";

export type ChatMessageUserProps = ComponentProps<"div"> & {
  message: MyUIMessage;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
};

export function ChatMessageUser({
  message,
  className,
  consolidate,
  enableCodeHighlighting,
  ...props
}: ChatMessageUserProps) {
  const readRawText = () => extractRawTextFromMessageParts(message.parts);
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
          <MessageContentParts
            consolidate={consolidate}
            enableCodeHighlighting={enableCodeHighlighting}
            parts={message.parts}
          />
        </Message.Content>
        <Message.Footer>
          <MessageFooterUser
            createdAt={message.metadata?.createdAt}
            messageId={message.id}
            onAction={handleFooterAction}
            readEditInitialText={readRawText}
          />
        </Message.Footer>
      </Message.Root>
    </div>
  );
}

export type ChatMessageUserStoreItemProps = Omit<
  ChatMessageUserProps,
  "message"
> & {
  messageId: string;
};

function UserContentStoreItem({
  messageId,
  consolidate,
  enableCodeHighlighting,
}: Pick<
  ChatMessageUserStoreItemProps,
  "messageId" | "consolidate" | "enableCodeHighlighting"
>) {
  const parts = useMessageParts(messageId) ?? [];

  return (
    <Message.Content variant="user">
      <MessageContentParts
        consolidate={consolidate}
        enableCodeHighlighting={enableCodeHighlighting}
        parts={parts}
      />
    </Message.Content>
  );
}

function UserFooterStoreItem({ messageId }: { messageId: string }) {
  const metadata = useMessageMetadata(messageId);
  const readRawText = useMessageRawTextReader(messageId);
  const { handleFooterAction } = useMessageActions({
    messageId,
    role: "user",
  });

  return (
    <MessageFooterUser
      createdAt={metadata?.createdAt}
      messageId={messageId}
      onAction={handleFooterAction}
      readEditInitialText={readRawText}
    />
  );
}

export function ChatMessageUserStoreItem({
  messageId,
  className,
  consolidate,
  enableCodeHighlighting,
  ...props
}: ChatMessageUserStoreItemProps) {
  return (
    <div
      className={cn("flex w-full flex-col items-end gap-2", className)}
      {...props}
    >
      <Message.Root className="w-fit max-w-[90%] sm:max-w-[80%]" from="user">
        <UserContentStoreItem
          consolidate={consolidate}
          enableCodeHighlighting={enableCodeHighlighting}
          messageId={messageId}
        />
        <Message.Footer>
          <UserFooterStoreItem messageId={messageId} />
        </Message.Footer>
      </Message.Root>
    </div>
  );
}
