import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  type AlwaysRenderConfig,
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

export type EnrichedLegendListRef = LegendListRef & {
  onceLastItemKey: (key: string, callback: () => unknown) => void;
};

export type MessagesListVirtualProps = {
  messages: MyUIMessage[];
  shouldReserveLastAssistantSpace: boolean;
  listRef: RefObject<EnrichedLegendListRef | null>;
  onStartReached?: () => void;
  onEndReached?: () => void;
  onLayoutReady?: () => void;
};

const ALWAYS_RENDER_CONFIG: AlwaysRenderConfig = {
  bottom: 2,
};

function SeparatorComponent() {
  return <div className="h-10" />;
}

function messageKeyExtractor(message: MyUIMessage) {
  return message.id;
}

function messageTypeExtractor(message: MyUIMessage) {
  return message.role;
}

export function MessagesListVirtual({
  messages,
  shouldReserveLastAssistantSpace,
  onStartReached,
  onEndReached,
  onLayoutReady,
  listRef,
}: MessagesListVirtualProps) {
  const isReady = useRef(false);
  // const listRef = useRef<EnrichedLegendListRef | null>(null);
  const messagesRef = useRef(messages);
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
    requestAnimationFrame(() =>
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      })
    );
    isReady.current = true;
    onLayoutReady?.();
  }, [listRef.current?.getState]);

  const handleLoad = useCallback(() => {
    onLayoutReady?.();
  }, [onLayoutReady]);

  const renderItem = useCallback(
    ({ item, index }: LegendListRenderItemProps<MyUIMessage>) => {
      const isLast = index === messagesRef.current.length - 1;
      const isDynamic = isLast && shouldReserveLastAssistantSpace;
      const shouldReserveForAssistant = item.role === "assistant" && isDynamic;

      return (
        <div
          className={cn(
            shouldReserveForAssistant && "min-h-[calc(100vh-20rem)]"
          )}
          key={item.id}
        >
          <ChatMessage
            consolidate={!isDynamic}
            enableCodeHighlighting={true} // TODO: how to handle isReady reactivity here ???
            message={item}
          />
        </div>
      );
    },
    [shouldReserveLastAssistantSpace]
  );

  // if (messages.length === 0) return null;

  return (
    <>
      <ScrollEdgeProbe ref={topRef} />
      <LegendList<MyUIMessage>
        alignItemsAtEnd
        alwaysRender={ALWAYS_RENDER_CONFIG}
        data={messages}
        getItemType={messageTypeExtractor}
        ItemSeparatorComponent={SeparatorComponent}
        initialScrollAtEnd
        keyExtractor={messageKeyExtractor}
        maintainVisibleContentPosition
        onLayout={handleLayout}
        onLoad={handleLoad}
        recycleItems
        ref={listRef}
        renderItem={renderItem}
        suggestEstimatedItemSize
        useWindowScroll
        waitForInitialLayout
      />
      <ScrollEdgeProbe ref={bottomRef} />
    </>
  );
}
