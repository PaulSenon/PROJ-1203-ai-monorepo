import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { WindowVirtualizerHandle } from "virtua";
import { WindowVirtualizer } from "virtua";
import { ChatMessage } from "@/components/chat/message/message";
import { cn } from "@/lib/utils";

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
  const virtualizerRef = useRef<WindowVirtualizerHandle>(null);

  // ── Boot anchor: scroll to bottom on thread open ──────────────────────
  const bootResolvedKeyRef = useRef<string | null>(null);

  const scrollToConversationBottom = useCallback(() => {
    if (messages.length === 0) return;
    virtualizerRef.current?.scrollToIndex(messages.length - 1, {
      align: "start",
    });
  }, [messages.length]);

  // Initial bottom anchor on boot
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

    scrollToConversationBottom();
  }, [
    bootRequestKey,
    messages.length,
    onBootAnchored,
    scrollToConversationBottom,
  ]);

  // Resolve boot anchor after virtualizer settles near bottom
  useEffect(() => {
    if (!(bootRequestKey && onBootAnchored)) return;
    if (bootResolvedKeyRef.current === bootRequestKey) return;
    if (messages.length === 0) return;

    const handle = virtualizerRef.current;
    if (!handle) return;

    const viewportSize = handle.viewportSize;
    if (viewportSize === 0) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const bottomDistance = scrollHeight - handle.scrollOffset - viewportSize;
    if (bottomDistance > 2) {
      // Not at bottom yet — try once more
      scrollToConversationBottom();
      return;
    }

    bootResolvedKeyRef.current = bootRequestKey;
    onBootAnchored(bootRequestKey);
  });

  // ── Submit anchor: scroll to bottom on new message ────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <WindowVirtualizer bufferSize={500} ref={virtualizerRef}>
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1;

        return (
          <div className={cn("pb-10", isLast && "pb-0")} key={message.id}>
            <ConversationMessageItem
              isLast={isLast}
              message={message}
              shouldReserveLastAssistantSpace={shouldReserveLastAssistantSpace}
            />
          </div>
        );
      })}
    </WindowVirtualizer>
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
