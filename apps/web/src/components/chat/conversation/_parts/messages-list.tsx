import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from "@legendapp/list/react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChatMessage } from "@/components/chat/message/message";
import {
  ScrollEdgeProbe,
  useScrollEdges,
} from "@/hooks/utils/use-scroll-edges";
import { cn } from "@/lib/utils";

export type EnrichedLegendListRef = LegendListRef & {
  onceLastItemKey: (key: string, callback: () => unknown) => void;
};

export type ConversationMessagesListProps = {
  messages: MyUIMessage[];
  shouldReserveLastAssistantSpace: boolean;
  listRef: RefObject<EnrichedLegendListRef | null>;
  onStartReached?: () => void;
  onEndReached?: () => void;
  // startDetectionOffsetPx?: number;
  // endDetectionOffsetPx?: number;
};

// const ESTIMATED_MESSAGE_ITEM_SIZE = 160;
// const MESSAGE_VIRTUAL_DRAW_DISTANCE = 140;

export function ConversationMessagesList({
  messages,
  shouldReserveLastAssistantSpace,
  listRef,
  onStartReached,
  onEndReached,
  // startDetectionOffsetPx = 0,
  // endDetectionOffsetPx = 0,
}: ConversationMessagesListProps) {
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [isReady, setIsReady] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [_, rerender] = useState(0);
  // TODO wire onStart and onEnd observers
  const observers = useRef<Map<string, ((id: string) => void)[]>>(null);
  if (observers.current === null) {
    observers.current = new Map();
  }

  useEffect(() => {
    if (listRef.current === null) return;
    listRef.current.onceLastItemKey = (
      key: string,
      callback: () => unknown
    ) => {
      // if already present, trigger callback without subscribing
      if (messagesRef.current.findLastIndex((m) => m.id === key) !== -1) {
        console.log("LAST SHORTCUT", key);
        callback();
        return;
      }
      if (observers.current === null) return;
      const obsForKey = observers.current.get(key) ?? [];

      observers.current.set(key, [...obsForKey, callback]);
    };
    listRef.current.getState().listen("lastItemKeys", (keys) => {
      for (const key of keys) {
        for (const obs of observers.current?.get(key) ?? []) {
          obs(key);
          observers.current?.delete(key);
        }
      }
      console.log("LAST ITEM KEYS", {
        keys,
        obs: observers.current?.entries(),
      });
    });
  }, [listRef.current]);

  const scrollToEnd = useCallback(
    (options?: { animated?: boolean; viewOffset?: number }): Promise<void> => {
      // biome-ignore lint/suspicious/noTsIgnore: temporary
      // @ts-ignore Wrongly typed from source
      // return listRef.current?.getNativeScrollRef().scrollToEnd(options);
      return window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: options?.animated ? "smooth" : "instant",
      });
    },
    []
  );

  const handleLayout = useCallback(() => {
    if (!isReady) rerender(Date.now());
  }, [isReady]);

  useLayoutEffect(() => {
    if (!isLoaded) return;
    if (isReady) return;
    scrollToEnd({ animated: false });
    setMargin(`${window.document.documentElement.scrollHeight * 0.9}px`);
    // Reaveal on next frame to avoid flicker
    const raf = requestAnimationFrame(() => setIsReady(true));
    return () => {
      cancelAnimationFrame(raf);
    };
  });

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
            message={item}
          />
        </div>
      );
    },
    [shouldReserveLastAssistantSpace]
  );

  const [margin, setMargin] = useState("0px");
  const handleStartReached = useCallback(() => {
    if (!isReady) return;
    onStartReached?.();
  }, [onStartReached, isReady]);
  const handleEndReached = useCallback(() => {
    if (!isReady) return;
    onEndReached?.();
  }, [onEndReached, isReady]);

  const { topRef, bottomRef } = useScrollEdges({
    onBottomReached: handleEndReached,
    onTopReached: handleStartReached,
    rootMargin: margin,
  });

  return (
    <div
      // HACK to prevent jumping scrollbar
      className={cn(
        "transition-opacity duration-200 ease-snappy will-change-opacity",
        isReady // HACK to hide flickering
          ? "opacity-100"
          : "opacity-0"
      )}
      data-loading-window-scrollbar={isReady ? undefined : true}
    >
      <ScrollEdgeProbe ref={topRef} />
      <LegendList<MyUIMessage>
        alignItemsAtEnd
        data={messages}
        initialScrollAtEnd // broken for now. DO NOT USE
        keyExtractor={(message) => message.id}
        maintainVisibleContentPosition
        onLayout={handleLayout}
        onLoad={() => setIsLoaded(true)}
        // onScroll={handleScroll}
        // onEndReached={onEndReached} // broken for now. DO NOT USE
        // onEndReachedThreshold={endDetectionOffsetPx} // broken for now. DO NOT USE
        // onStartReached={handleStartReached} // broken for now. DO NOT USE
        // onStartReachedThreshold={0.2} // broken for now. DO NOT USE
        // recycleItems
        ref={listRef}
        renderItem={renderItem}
        useWindowScroll
      />
      <ScrollEdgeProbe ref={bottomRef} />
    </div>
  );
}
