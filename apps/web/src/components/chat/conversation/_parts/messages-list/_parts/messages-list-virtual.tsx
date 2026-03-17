import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  type AlwaysRenderConfig,
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from "@legendapp/list/react";
import { useCallback, useRef } from "react";
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
  onStartReached?: () => void;
  onEndReached?: () => void;
  onLayoutReady?: () => void;
  onLastItemKeyUpdate?: (lastItemKey?: string) => void;
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
  onLastItemKeyUpdate,
}: MessagesListVirtualProps) {
  const listRef = useRef<EnrichedLegendListRef | null>(null);
  const isReady = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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

  /**
   * Two little hacks here.
   * - we want initial scroll to be as window end, not list end
   * - we should only do that on "first layout but only when state is ready"
   */
  const raf = useRef(0);
  const handleLayout = useCallback(() => {
    // skip if we already did our initial scroll once
    if (isReady.current === true) {
      // when ready we notify last added item key when layout changes
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        onLastItemKeyUpdate?.(messagesRef.current.at(-1)?.id);
      });
      return;
    }

    // on first load we trigger ready event
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      isReady.current = true;
      onLayoutReady?.();
    });
  }, [onLayoutReady, onLastItemKeyUpdate]);

  // This is only a safety net, in case the ready event isn't properly fired
  // on layout. Because this is critical as it might block the full UI in a loading
  // state. So we also handle onLoad that runs later than layout but I guess it's less
  // framerate dependent.
  const handleLoad = useCallback(() => {
    onLayoutReady?.();
  }, [onLayoutReady]);

  const renderItem = useCallback(
    ({ item, index }: LegendListRenderItemProps<MyUIMessage>) => {
      const isLast = index === messagesRef.current.length - 1;
      const isFollowup = messagesRef.current.length > 2;
      const isDynamic = isLast && shouldReserveLastAssistantSpace;
      const shouldReserveForAssistant =
        item.role === "assistant" && isDynamic && isFollowup;

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

  // just a safety net
  if (messages.length === 0) return null;

  return (
    <>
      <ScrollEdgeProbe ref={topRef} />
      <LegendList<MyUIMessage>
        alignItemsAtEnd={true}
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
        waitForInitialLayout={false}
      />
      <ScrollEdgeProbe ref={bottomRef} />
    </>
  );
}
