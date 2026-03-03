import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import {
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from "@legendapp/list/react";
import type React from "react";
import { useCallback, useLayoutEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ThreadItem } from "./thread-item";

type ThreadDoc = Doc<"threads">;
type ListSupplementalComponent =
  | React.ComponentType<unknown>
  | React.ReactElement;

export function SidebarVirtualThreadList({
  threads,
  activeThreadId,
  isMobile,
  canLoadMore,
  isLoadingMore,
  onLoadMore,
  onEdgeStateChange,
  header,
  footer,
}: {
  threads: ThreadDoc[];
  activeThreadId?: string;
  isMobile: boolean;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  onLoadMore?: () => void;
  onEdgeStateChange?: (isAtTop: boolean, isAtBottom: boolean) => void;
  header?: ListSupplementalComponent;
  footer?: ListSupplementalComponent;
}) {
  const threadCount = threads.length;
  const { openMobile } = useSidebar();
  const listRef = useRef<LegendListRef | null>(null);
  const lastKnownScrollOffsetRef = useRef(0);

  const setEdgeState = useCallback(
    (isAtTop: boolean, isAtBottom: boolean) => {
      onEdgeStateChange?.(isAtTop, isAtBottom);
    },
    [onEdgeStateChange]
  );

  const syncEdgeStateFromList = useCallback(() => {
    const listState = listRef.current?.getState();
    if (!listState) {
      return;
    }

    setEdgeState(listState.isAtStart, listState.isAtEnd);
  }, [setEdgeState]);

  const handleLoadMore = useCallback(() => {
    if (!canLoadMore || isLoadingMore) {
      return;
    }
    onLoadMore?.();
  }, [canLoadMore, isLoadingMore, onLoadMore]);

  const handleListLayout = useCallback(() => {
    syncEdgeStateFromList();
  }, [syncEdgeStateFromList]);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      const viewportHeight = event.nativeEvent.layoutMeasurement.height;
      const contentHeight = event.nativeEvent.contentSize.height;
      const distanceFromEnd = contentHeight - (scrollY + viewportHeight);

      lastKnownScrollOffsetRef.current = scrollY;
      setEdgeState(scrollY <= 1, distanceFromEnd <= 1);
    },
    [setEdgeState]
  );

  const renderThreadItem = useCallback(
    ({ item: thread, index }: LegendListRenderItemProps<ThreadDoc>) => (
      <ThreadItem.Root
        as="div"
        className={cn("px-4", index > 0 && "pt-1.5")}
        isActive={thread.uuid === activeThreadId}
        isMobile={isMobile}
        thread={thread}
      />
    ),
    [activeThreadId, isMobile]
  );

  useLayoutEffect(() => {
    syncEdgeStateFromList();
  }, [syncEdgeStateFromList, threadCount]);

  useLayoutEffect(() => {
    if (!(isMobile && openMobile)) {
      return;
    }

    const stateScroll = listRef.current?.getState().scroll;
    const targetOffset = stateScroll ?? lastKnownScrollOffsetRef.current;

    listRef.current?.scrollToOffset({
      animated: false,
      offset: Math.max(0, targetOffset),
    });
  }, [isMobile, openMobile]);

  return (
    <LegendList<ThreadDoc>
      className="flex min-h-0 flex-1 flex-col gap-0 overscroll-contain p-0"
      data={threads}
      drawDistance={180}
      estimatedItemSize={44}
      extraData={activeThreadId ?? null}
      keyExtractor={(thread) => thread.uuid}
      ListFooterComponent={footer}
      ListHeaderComponent={header}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={1}
      onLayout={handleListLayout}
      onLoad={syncEdgeStateFromList}
      onScroll={handleScroll}
      recycleItems={false}
      ref={listRef}
      renderItem={renderThreadItem}
      role="list"
    />
  );
}
