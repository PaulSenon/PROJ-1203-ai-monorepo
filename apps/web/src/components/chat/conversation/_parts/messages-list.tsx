import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from "@legendapp/list/react";
import { type RefObject, useCallback, useEffect, useRef } from "react";
import { ChatMessage } from "@/components/chat/message/message";
import {
  ScrollEdgeProbe,
  useScrollEdges,
} from "@/hooks/utils/use-scroll-edges";
import { cn } from "@/lib/utils";

export type ConversationMessagesListProps = {
  messages: MyUIMessage[];
  shouldReserveLastAssistantSpace: boolean;
  listRef: RefObject<LegendListRef | null>;
  onStartReached?: () => void;
  onEndReached?: () => void;
};

const TAIL_SENSITIVE_COUNT = 2;

export function ConversationMessagesList({
  messages,
  shouldReserveLastAssistantSpace,
  onStartReached,
  onEndReached,
  listRef,
}: ConversationMessagesListProps) {
  const isReady = useRef(false);
  const messagesRef = useRef(messages);
  const previousLastMessageIdRef = useRef<string | undefined>(undefined);
  const handleStartReached = useCallback(() => {
    if (!isReady.current) return;
    onStartReached?.();
  }, [onStartReached]);
  const handleEndReached = useCallback(() => {
    if (!isReady.current) return;
    onEndReached?.();
  }, [onEndReached]);
  const { topRef, bottomRef } = useScrollEdges({
    onBottomReached: handleEndReached,
    onTopReached: handleStartReached,
    rootMargin: "100%",
  });

  messagesRef.current = messages;
  useEffect(() => {
    previousLastMessageIdRef.current = messages.at(-1)?.id;
  }, [messages]);

  const areMessagesEqual = useCallback(
    (
      previous: MyUIMessage,
      next: MyUIMessage,
      index: number,
      data: readonly MyUIMessage[]
    ) => {
      if (previous !== next) return false;

      if (previous.id === previousLastMessageIdRef.current) return false;

      const tailStartIndex = Math.max(0, data.length - TAIL_SENSITIVE_COUNT);
      if (index >= tailStartIndex) return false;

      return true;
    },
    []
  );

  /**
   * Two little hacks here.
   * - we want initial scroll to be as window end, not list end
   * - we should only do that on "first layout but only when state is ready"
   */
  const handleLayout = useCallback(() => {
    // skip if we already did our initial scroll once
    if (isReady.current === true) return;
    // skip if internal list state not ready (meaning window height ready)
    if (listRef.current?.getState() === undefined) return;

    // perform real window end scroll
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    });
    isReady.current = true;
  }, [listRef.current?.getState]);

  const renderItem = useCallback(
    ({ item, index }: LegendListRenderItemProps<MyUIMessage>) => {
      const isLast = index === messagesRef.current.length - 1;
      const isDynamic = isLast && shouldReserveLastAssistantSpace;
      const shouldReserveForAssistant = item.role === "assistant" && isDynamic;

      return (
        <div className={cn(!isLast && "pb-10")} key={item.id}>
          <ChatMessage
            className={cn(
              shouldReserveForAssistant && "min-h-[calc(100vh-20rem)]"
            )}
            consolidate={!isDynamic}
            enableCodeHighlighting={true} // TODO: how to handle isReady reactivity here ???
            message={item}
          />
        </div>
      );
    },
    [shouldReserveLastAssistantSpace]
  );

  if (messages.length === 0) return null;

  return (
    <>
      <ScrollEdgeProbe ref={topRef} />
      <LegendList<MyUIMessage>
        alignItemsAtEnd
        data={messages}
        initialScrollAtEnd
        itemsAreEqual={areMessagesEqual}
        keyExtractor={(message) => message.id}
        maintainVisibleContentPosition={true}
        onLayout={handleLayout}
        ref={listRef}
        renderItem={renderItem}
        suggestEstimatedItemSize
        useWindowScroll
        waitForInitialLayout={true}
      />
      <ScrollEdgeProbe ref={bottomRef} />
    </>
  );
}
