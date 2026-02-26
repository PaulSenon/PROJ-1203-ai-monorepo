import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { RefObject } from "react";
import { useLayoutEffect, useRef } from "react";
import type { WindowVirtualizerHandle } from "virtua";
import { useScrollToBottomActions } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";

export function useScrollToBottomOnSubmit({
  pendingAutoScrollMessageId,
  messages,
  windowVirtualizerRef,
}: {
  pendingAutoScrollMessageId: string | undefined;
  messages: MyUIMessage[];
  windowVirtualizerRef: RefObject<WindowVirtualizerHandle | null>;
}) {
  const { scrollToBottom } = useScrollToBottomActions();
  const lastHandledIntentIdRef = useRef<string | undefined>(undefined);
  const tailMessageId = messages.at(-1)?.id;
  const beforeTailMessageId = messages.at(-2)?.id;

  useLayoutEffect(() => {
    if (!pendingAutoScrollMessageId) return;
    if (lastHandledIntentIdRef.current === pendingAutoScrollMessageId) return;

    // Scroll only when submit intent exists and message is committed at list tail.
    const hasIntentMessageInTail =
      tailMessageId === pendingAutoScrollMessageId ||
      beforeTailMessageId === pendingAutoScrollMessageId;
    if (!hasIntentMessageInTail) return;

    const lastIndex = messages.length - 1;
    if (lastIndex >= 0 && windowVirtualizerRef.current) {
      windowVirtualizerRef.current.scrollToIndex(lastIndex, {
        align: "end",
      });
    }

    scrollToBottom("instant");

    lastHandledIntentIdRef.current = pendingAutoScrollMessageId;
  }, [
    pendingAutoScrollMessageId,
    messages.length,
    tailMessageId,
    beforeTailMessageId,
    windowVirtualizerRef,
    scrollToBottom,
  ]);
}
