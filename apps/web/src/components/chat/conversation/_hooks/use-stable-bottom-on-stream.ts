import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { RefObject } from "react";
import { useLayoutEffect } from "react";
import type { WindowVirtualizerHandle } from "virtua";
import {
  useScrollToBottomActions,
  useScrollToBottomState,
} from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";

function isStreamingAssistantMessage(message: MyUIMessage | undefined) {
  if (!message) return false;
  if (message.role !== "assistant") return false;

  const status = message.metadata?.liveStatus;
  return status === "pending" || status === "streaming";
}

export function useStableBottomOnStream({
  messages,
  windowVirtualizerRef,
}: {
  messages: MyUIMessage[];
  windowVirtualizerRef: RefObject<WindowVirtualizerHandle | null>;
}) {
  const { isAtBottom } = useScrollToBottomState();
  const { scrollToBottom } = useScrollToBottomActions();

  const tailMessage = messages.at(-1);
  const tailMessageId = tailMessage?.id;
  const tailUpdatedAt = tailMessage?.metadata?.updatedAt;
  const shouldStabilizeBottom =
    isAtBottom && isStreamingAssistantMessage(tailMessage);

  useLayoutEffect(() => {
    if (!shouldStabilizeBottom) return;

    const lastIndex = messages.length - 1;
    if (lastIndex >= 0 && windowVirtualizerRef.current) {
      windowVirtualizerRef.current.scrollToIndex(lastIndex, {
        align: "end",
      });
    }

    scrollToBottom("instant");
  }, [
    shouldStabilizeBottom,
    messages.length,
    tailMessageId,
    tailUpdatedAt,
    windowVirtualizerRef,
    scrollToBottom,
  ]);
}
