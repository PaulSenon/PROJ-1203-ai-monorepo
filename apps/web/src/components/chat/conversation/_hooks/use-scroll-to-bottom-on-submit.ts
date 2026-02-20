import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useCallback, useLayoutEffect, useRef } from "react";
import { useScrollToBottomActions } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";

const SUBMIT_SCROLL_SETTLE_MAX_FRAMES = 24;
const SUBMIT_SCROLL_SETTLE_STABLE_VISIBLE_FRAMES = 2;

export function useScrollToBottomOnSubmit({
  pendingAutoScrollMessageId,
  messages,
}: {
  pendingAutoScrollMessageId: string | undefined;
  messages: MyUIMessage[];
}) {
  const { isProbeVisible, scrollToBottom } = useScrollToBottomActions();
  const lastHandledIntentIdRef = useRef<string | undefined>(undefined);
  const settleRafIdRef = useRef<number | null>(null);
  const tailMessageId = messages.at(-1)?.id;
  const beforeTailMessageId = messages.at(-2)?.id;

  const clearSettleLoop = useCallback(() => {
    const rafId = settleRafIdRef.current;
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    settleRafIdRef.current = null;
  }, []);

  const scrollToBottomAfterSettle = useCallback(() => {
    clearSettleLoop();
    scrollToBottom("instant");

    let remainingFrames = SUBMIT_SCROLL_SETTLE_MAX_FRAMES;
    let visibleFrames = 0;

    const settle = () => {
      if (isProbeVisible("bottom")) {
        visibleFrames += 1;
      } else {
        visibleFrames = 0;
        scrollToBottom("instant");
      }

      remainingFrames -= 1;
      if (
        visibleFrames >= SUBMIT_SCROLL_SETTLE_STABLE_VISIBLE_FRAMES ||
        remainingFrames <= 0
      ) {
        settleRafIdRef.current = null;
        return;
      }

      settleRafIdRef.current = requestAnimationFrame(settle);
    };

    settleRafIdRef.current = requestAnimationFrame(settle);
  }, [clearSettleLoop, isProbeVisible, scrollToBottom]);

  useLayoutEffect(() => clearSettleLoop, [clearSettleLoop]);

  useLayoutEffect(() => {
    if (!pendingAutoScrollMessageId) return;
    if (lastHandledIntentIdRef.current === pendingAutoScrollMessageId) return;

    // Scroll only when submit intent exists and message is committed at list tail.
    const hasIntentMessageInTail =
      tailMessageId === pendingAutoScrollMessageId ||
      beforeTailMessageId === pendingAutoScrollMessageId;
    if (!hasIntentMessageInTail) return;

    scrollToBottomAfterSettle();
    lastHandledIntentIdRef.current = pendingAutoScrollMessageId;
  }, [
    pendingAutoScrollMessageId,
    tailMessageId,
    beforeTailMessageId,
    scrollToBottomAfterSettle,
  ]);
}
