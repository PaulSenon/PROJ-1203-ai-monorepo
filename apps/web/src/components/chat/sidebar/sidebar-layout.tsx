import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import {
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from "@legendapp/list/react";
import type React from "react";
import {
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";
import { ScrollbarZIndexHack } from "@/components/ui-custom/utils/scrollbar-z-index-hack";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SidebarFloatingActions } from "./_parts/sidebar-floating-actions";
import { SidebarFooter, SidebarFooterSpacer } from "./_parts/sidebar-footer";
import { SidebarHeader, SidebarHeaderSpacer } from "./_parts/sidebar-header";
import { ThreadItem } from "./_parts/thread-item";

type ThreadDoc = Doc<"threads">;

export function ChatSidebarLayout({
  className,
  activeThreadId,
  threads,
  children,
  onLoadMore,
  canLoadMore = false,
  isLoadingMore = false,
  onNewChat,
}: {
  className?: string;
  activeThreadId?: string;
  threads: ThreadDoc[];
  children?: React.ReactNode;
  onLoadMore?: () => void;
  canLoadMore?: boolean;
  isLoadingMore?: boolean;
  onNewChat?: () => void;
}) {
  const isMobile = useIsMobile();
  const listRef = useRef<LegendListRef | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const setEdgeState = useCallback(
    (nextIsAtTop: boolean, nextIsAtBottom: boolean) => {
      setIsAtTop((prev) => (prev === nextIsAtTop ? prev : nextIsAtTop));
      setIsAtBottom((prev) =>
        prev === nextIsAtBottom ? prev : nextIsAtBottom
      );
    },
    []
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

      setEdgeState(scrollY <= 1, distanceFromEnd <= 1);
    },
    [setEdgeState]
  );

  const deferredThreads = useDeferredValue(threads, []);
  const renderThreadItem = useCallback(
    ({ item: thread, index }: LegendListRenderItemProps<ThreadDoc>) => (
      <div className={cn("px-4", index > 0 && "pt-1.5")}>
        <ThreadItem.Root
          isActive={thread.uuid === activeThreadId}
          isMobile={isMobile}
          thread={thread}
        />
      </div>
    ),
    [activeThreadId, isMobile]
  );
  const listHeader = useMemo(
    () => (
      <>
        <SidebarHeaderSpacer />
        <ScrollbarZIndexHack zIndex={51} />
        <div className="px-2 pt-2">
          <SidebarShell.GroupLabel>Previous Chats</SidebarShell.GroupLabel>
        </div>
      </>
    ),
    []
  );

  const listFooter = useMemo(() => <SidebarFooterSpacer />, []);

  useLayoutEffect(() => {
    syncEdgeStateFromList();
  }, [syncEdgeStateFromList, deferredThreads]);

  return (
    <SidebarShell.Provider>
      <SidebarShell.Root className={className} variant="inset">
        <SidebarHeader
          className="absolute top-0 z-50 w-full"
          isOverflowing={!isAtTop}
          onNewChat={onNewChat}
        />
        <LegendList<ThreadDoc>
          className="flex min-h-0 flex-1 flex-col gap-0 overscroll-contain p-0"
          data={deferredThreads}
          drawDistance={180}
          estimatedItemSize={44}
          keyExtractor={(thread) => thread.uuid}
          ListFooterComponent={listFooter}
          ListHeaderComponent={listHeader}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={1}
          onLoad={syncEdgeStateFromList}
          onScroll={handleScroll}
          recycleItems={false}
          ref={listRef}
          renderItem={renderThreadItem}
        />
        <SidebarFooter
          className="absolute bottom-0 z-50 w-full"
          isOverflowing={!isAtBottom}
        />
      </SidebarShell.Root>

      <SidebarFloatingActions
        className="fixed top-3 top-safe-offset-2 left-3"
        onNewChat={onNewChat}
      />

      <SidebarShell.Inset>{children}</SidebarShell.Inset>
    </SidebarShell.Provider>
  );
}
