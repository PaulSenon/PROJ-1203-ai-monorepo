import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useLayoutEffect, useRef } from "react";
import { useScrollToBottomActions } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";

export function useScrollToBottomOnSubmit({
  pendingAutoScrollMessageId,
  messages,
}: {
  pendingAutoScrollMessageId: string | undefined;
  messages: MyUIMessage[];
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

    scrollToBottom("instant");
    lastHandledIntentIdRef.current = pendingAutoScrollMessageId;
  }, [
    pendingAutoScrollMessageId,
    tailMessageId,
    beforeTailMessageId,
    scrollToBottom,
  ]);
}
