import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/chat/message/message";
import { cn } from "@/lib/utils";

const CONVERSATION_VIRTUAL_OVERSCAN = 3;
const CONVERSATION_VIRTUAL_ESTIMATE_ASSISTANT_SIZE = 280;
const CONVERSATION_VIRTUAL_ESTIMATE_USER_SIZE = 96;
const CONVERSATION_VIRTUAL_ESTIMATE_OTHER_SIZE = 140;
const CONVERSATION_VIRTUAL_USE_FLUSH_SYNC = false;

function isStreamingAssistant(message: MyUIMessage | undefined) {
  if (!message || message.role !== "assistant") return false;
  const liveStatus = message.metadata?.liveStatus;
  return liveStatus === "pending" || liveStatus === "streaming";
}

function estimateMessageSize(message: MyUIMessage | undefined) {
  if (!message) return CONVERSATION_VIRTUAL_ESTIMATE_ASSISTANT_SIZE;
  if (message.role === "assistant") {
    return CONVERSATION_VIRTUAL_ESTIMATE_ASSISTANT_SIZE;
  }
  if (message.role === "user") {
    return CONVERSATION_VIRTUAL_ESTIMATE_USER_SIZE;
  }
  return CONVERSATION_VIRTUAL_ESTIMATE_OTHER_SIZE;
}

export type ConversationMessagesListProps = {
  messages: MyUIMessage[];
  shouldReserveLastAssistantSpace: boolean;
  onLoadOlder?: () => void;
};

export const ConversationMessagesList = memo(function ConversationMessagesList({
  messages,
  shouldReserveLastAssistantSpace,
}: ConversationMessagesListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;

    const updateScrollMargin = () => {
      const next = listEl.offsetTop;
      setScrollMargin((prev) => (prev === next ? prev : next));
    };

    updateScrollMargin();
    window.addEventListener("resize", updateScrollMargin);

    return () => {
      window.removeEventListener("resize", updateScrollMargin);
    };
  }, []);
  const getMessageItemKey = useCallback(
    (index: number) => {
      const message = messages[index];
      if (!message) {
        throw new Error("Conversation virtualizer key invariant violated");
      }
      return message.id;
    },
    [messages]
  );

  const virtualizer = useWindowVirtualizer({
    count: messages.length,
    estimateSize: (index) => estimateMessageSize(messages[index]),
    getItemKey: getMessageItemKey,
    overscan: CONVERSATION_VIRTUAL_OVERSCAN,
    scrollMargin,
    useFlushSync: CONVERSATION_VIRTUAL_USE_FLUSH_SYNC,
  });

  const streamingTailMessage = messages.at(-1);
  const hasStreamingAssistantTail = isStreamingAssistant(streamingTailMessage);

  useLayoutEffect(() => {
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (
      item,
      _delta,
      instance
    ) => {
      const isStreamingTail =
        hasStreamingAssistantTail && item.index === messages.length - 1;

      if (isStreamingTail) {
        return false;
      }

      const scrollOffset = instance.scrollOffset ?? 0;
      return item.start < scrollOffset;
    };

    return () => {
      virtualizer.shouldAdjustScrollPositionOnItemSizeChange = undefined;
    };
  }, [hasStreamingAssistantTail, messages.length, virtualizer]);

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      className="relative w-full"
      ref={listRef}
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        overflowAnchor: "none",
      }}
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
}, areConversationMessagesListPropsEqual);

function areConversationMessagesListPropsEqual(
  prev: ConversationMessagesListProps,
  next: ConversationMessagesListProps
) {
  return (
    prev.messages === next.messages &&
    prev.shouldReserveLastAssistantSpace ===
      next.shouldReserveLastAssistantSpace &&
    prev.onLoadOlder === next.onLoadOlder
  );
}

const ConversationMessageItem = memo(function ConversationMessageItem({
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
});
