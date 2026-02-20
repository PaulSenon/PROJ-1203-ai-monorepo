import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { ChatMessage } from "@/components/chat/message/message";
import { cn } from "@/lib/utils";

const CONVERSATION_VIRTUAL_OVERSCAN = 8;
const CONVERSATION_VIRTUAL_ESTIMATE_SIZE = 360;

export type ConversationMessagesListProps = {
  messages: MyUIMessage[];
  shouldReserveLastAssistantSpace: boolean;
};

export function ConversationMessagesList({
  messages,
  shouldReserveLastAssistantSpace,
}: ConversationMessagesListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const scrollMargin = listRef.current?.offsetTop ?? 0;

  const virtualizer = useWindowVirtualizer({
    count: messages.length,
    estimateSize: () => CONVERSATION_VIRTUAL_ESTIMATE_SIZE,
    getItemKey: (index) => messages[index]?.id ?? index,
    overscan: CONVERSATION_VIRTUAL_OVERSCAN,
    scrollMargin,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      className="relative w-full"
      ref={listRef}
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualRows.map((virtualRow) => {
        const message = messages[virtualRow.index];
        if (!message) {
          return null;
        }

        const isLast = virtualRow.index === messages.length - 1;

        return (
          <div
            className={cn(
              "absolute top-0 left-0 w-full pb-10",
              isLast && "pb-0"
            )}
            data-index={virtualRow.index}
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            style={{
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
            }}
          >
            <ConversationMessageItem
              isLast={isLast}
              message={message}
              shouldReserveLastAssistantSpace={shouldReserveLastAssistantSpace}
            />
          </div>
        );
      })}
    </div>
  );
}

function ConversationMessageItem({
  message,
  isLast,
  shouldReserveLastAssistantSpace,
}: {
  message: MyUIMessage;
  isLast: boolean;
  shouldReserveLastAssistantSpace: boolean;
}) {
  const isAssistant = message.role === "assistant";
  const isDynamic = isLast && shouldReserveLastAssistantSpace;

  return (
    <ChatMessage
      className={cn(isAssistant && isDynamic && "min-h-[calc(100vh-20rem)]")}
      consolidate={!isDynamic}
      message={message}
    />
  );
}
