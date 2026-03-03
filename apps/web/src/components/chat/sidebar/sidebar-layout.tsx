import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import type React from "react";
import { useCallback, useDeferredValue, useMemo, useRef } from "react";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";
import { ScrollbarZIndexHack } from "@/components/ui-custom/utils/scrollbar-z-index-hack";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInView } from "@/hooks/utils/use-intersection-observer";
import {
  ScrollEdgeProbe,
  useScrollEdges,
} from "@/hooks/utils/use-scroll-edges";
import { useMergedRefs } from "@/lib/utils";
import { SidebarFloatingActions } from "./_parts/sidebar-floating-actions";
import { SidebarFooter, SidebarFooterSpacer } from "./_parts/sidebar-footer";
import { SidebarHeader, SidebarHeaderSpacer } from "./_parts/sidebar-header";
import { SidebarThreadList } from "./_parts/sidebar-thread-list";
import { ThreadItem } from "./_parts/thread-item";

type ThreadDoc = Doc<"threads">;

export function ChatSidebarLayout({
  className,
  activeThreadId,
  threads,
  children,
  onLoadMore,
  onNewChat,
}: {
  className?: string;
  activeThreadId?: string;
  threads: ThreadDoc[];
  children?: React.ReactNode;
  onLoadMore?: () => void;
  onNewChat?: () => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { isAtTop, isAtBottom, topRef, bottomRef } =
    useScrollEdges(scrollContainerRef);

  const handleLoadMore = useCallback(() => {
    onLoadMore?.();
  }, [onLoadMore]);

  const { ref: loadMoreRef } = useInView<HTMLDivElement>({
    rootRef: scrollContainerRef,
    rootMargin: "0px 0px 200% 0px",
    continuous: true,
    onEnter: handleLoadMore,
  });

  const mergedBottomRef = useMergedRefs<HTMLDivElement>(bottomRef, loadMoreRef);
  const deferredThreads = useDeferredValue(threads, []);
  const threadRows = useMemo(
    () =>
      deferredThreads.map((thread) => (
        <ThreadItem.Root
          isActive={thread.uuid === activeThreadId}
          isMobile={isMobile}
          key={thread.uuid}
          thread={thread}
        />
      )),
    [deferredThreads, activeThreadId, isMobile]
  );

  return (
    <SidebarShell.Provider>
      <SidebarShell.Root className={className} variant="inset">
        <SidebarHeader
          className="absolute top-0 z-50 w-full"
          isOverflowing={!isAtTop}
          onNewChat={onNewChat}
        />
        <SidebarShell.Content ref={scrollContainerRef}>
          <ScrollEdgeProbe ref={topRef} />
          <SidebarHeaderSpacer />
          <ScrollbarZIndexHack zIndex={51} />
          <SidebarThreadList>{threadRows}</SidebarThreadList>
          <SidebarFooterSpacer />
          <ScrollEdgeProbe ref={mergedBottomRef} />
        </SidebarShell.Content>
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
