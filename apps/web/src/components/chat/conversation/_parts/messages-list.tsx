import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  useWindowVirtualizer,
  type Virtualizer,
} from "@tanstack/react-virtual";
import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/chat/message/message";
import { cn } from "@/lib/utils";

const CONVERSATION_VIRTUAL_OVERSCAN = 3;
const CONVERSATION_VIRTUAL_ESTIMATE_ASSISTANT_SIZE = 280;
const CONVERSATION_VIRTUAL_ESTIMATE_USER_SIZE = 96;
const CONVERSATION_VIRTUAL_ESTIMATE_OTHER_SIZE = 140;
const CONVERSATION_ROW_BOTTOM_PADDING = 40;
const CONVERSATION_VIRTUAL_USE_FLUSH_SYNC = false;

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
  bootRequestKey?: string;
  pendingAutoScrollMessageId?: string;
  shouldReserveLastAssistantSpace: boolean;
  onBootAnchored?: (bootRequestKey: string) => void;
  onLoadOlder?: () => void;
};

export const ConversationMessagesList = memo(function ConversationMessagesList({
  messages,
  bootRequestKey,
  pendingAutoScrollMessageId,
  onBootAnchored,
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

  const initialOffset = useCallback(() => {
    if (typeof window === "undefined") return 0;
    if (!bootRequestKey || messages.length === 0) {
      return window.scrollY;
    }

    const listTop = listRef.current?.offsetTop ?? scrollMargin;
    const estimatedTotal = messages.reduce((sum, message, index) => {
      const isLast = index === messages.length - 1;
      const rowPadding = isLast ? 0 : CONVERSATION_ROW_BOTTOM_PADDING;
      return sum + estimateMessageSize(message) + rowPadding;
    }, 0);

    return Math.max(0, listTop + estimatedTotal - window.innerHeight);
  }, [bootRequestKey, messages, scrollMargin]);

  const initialRect =
    typeof window === "undefined"
      ? undefined
      : {
          height: window.innerHeight,
          width: window.innerWidth,
        };

  const bootResolvedKeyRef = useRef<string | null>(null);

  const maybeResolveBootAnchor = useCallback(
    (instance: Virtualizer<Window, Element>) => {
      if (!(bootRequestKey && onBootAnchored)) return;
      if (bootResolvedKeyRef.current === bootRequestKey) return;
      if (messages.length === 0) {
        bootResolvedKeyRef.current = bootRequestKey;
        onBootAnchored(bootRequestKey);
        return;
      }

      const scrollRect = instance.scrollRect;
      if (!scrollRect) return;

      const renderedItems = instance.getVirtualItems();
      const hasLastRendered = renderedItems.some(
        (item) => item.index === messages.length - 1
      );
      if (!hasLastRendered) return;

      const scrollOffset = instance.scrollOffset ?? 0;
      const bottomDistance =
        instance.getTotalSize() - (scrollOffset + scrollRect.height);
      if (bottomDistance > 2) return;

      bootResolvedKeyRef.current = bootRequestKey;
      onBootAnchored(bootRequestKey);
    },
    [bootRequestKey, messages.length, onBootAnchored]
  );

  const virtualizer = useWindowVirtualizer({
    count: messages.length,
    estimateSize: (index) => estimateMessageSize(messages[index]),
    getItemKey: getMessageItemKey,
    initialRect,
    initialOffset,
    onChange: (instance) => {
      maybeResolveBootAnchor(instance);
    },
    overscan: CONVERSATION_VIRTUAL_OVERSCAN,
    scrollMargin,
    useFlushSync: CONVERSATION_VIRTUAL_USE_FLUSH_SYNC,
  });

  useLayoutEffect(() => {
    if (!bootRequestKey) {
      bootResolvedKeyRef.current = null;
      return;
    }

    bootResolvedKeyRef.current = null;
    if (messages.length === 0) {
      onBootAnchored?.(bootRequestKey);
      return;
    }

    virtualizer.scrollToIndex(messages.length - 1, {
      align: "end",
      behavior: "auto",
    });
    maybeResolveBootAnchor(virtualizer);
  }, [
    bootRequestKey,
    maybeResolveBootAnchor,
    messages.length,
    onBootAnchored,
    virtualizer,
  ]);

  const scrollToConversationBottom = useCallback(() => {
    if (messages.length === 0) return;
    virtualizer.scrollToIndex(messages.length - 1, {
      align: "end",
      behavior: "auto",
    });
  }, [messages.length, virtualizer]);

  const lastHandledSubmitIntentRef = useRef<string | undefined>(undefined);
  const tailMessageId = messages.at(-1)?.id;
  const beforeTailMessageId = messages.at(-2)?.id;

  useLayoutEffect(() => {
    if (!pendingAutoScrollMessageId) return;
    if (lastHandledSubmitIntentRef.current === pendingAutoScrollMessageId)
      return;

    const hasIntentMessageInTail =
      tailMessageId === pendingAutoScrollMessageId ||
      beforeTailMessageId === pendingAutoScrollMessageId;
    if (!hasIntentMessageInTail) return;

    scrollToConversationBottom();
    lastHandledSubmitIntentRef.current = pendingAutoScrollMessageId;
  }, [
    pendingAutoScrollMessageId,
    tailMessageId,
    beforeTailMessageId,
    scrollToConversationBottom,
  ]);

  useLayoutEffect(() => {
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (
      item,
      _delta,
      instance
    ) => {
      const isStreamingTail = item.index === messages.length - 1;

      if (isStreamingTail) {
        return false;
      }

      const scrollOffset = instance.scrollOffset ?? 0;
      return item.start < scrollOffset;
    };

    return () => {
      virtualizer.shouldAdjustScrollPositionOnItemSizeChange = undefined;
    };
  }, [messages.length, virtualizer]);

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
    prev.bootRequestKey === next.bootRequestKey &&
    prev.pendingAutoScrollMessageId === next.pendingAutoScrollMessageId &&
    prev.onBootAnchored === next.onBootAnchored &&
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
