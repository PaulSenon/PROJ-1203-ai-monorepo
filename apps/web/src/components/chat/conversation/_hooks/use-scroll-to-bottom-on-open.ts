import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { RefObject } from "react";
import { useLayoutEffect, useRef } from "react";
import type { WindowVirtualizerHandle } from "virtua";
import { useScrollToBottomActions } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";

export function useScrollToBottomOnOpen({
  threadUuid,
  isDataPending,
  messages,
  windowVirtualizerRef,
}: {
  threadUuid: string;
  isDataPending: boolean;
  messages: MyUIMessage[];
  windowVirtualizerRef: RefObject<WindowVirtualizerHandle | null>;
}) {
  const { scrollToBottom } = useScrollToBottomActions();
  const lastHandledThreadRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (isDataPending) return;
    if (messages.length === 0) return;
    if (lastHandledThreadRef.current === threadUuid) return;

    const lastIndex = messages.length - 1;
    if (lastIndex >= 0 && windowVirtualizerRef.current) {
      windowVirtualizerRef.current.scrollToIndex(lastIndex, {
        align: "end",
      });
    } else {
      scrollToBottom("instant");
    }

    lastHandledThreadRef.current = threadUuid;
  }, [
    threadUuid,
    isDataPending,
    messages.length,
    windowVirtualizerRef,
    scrollToBottom,
  ]);
}
