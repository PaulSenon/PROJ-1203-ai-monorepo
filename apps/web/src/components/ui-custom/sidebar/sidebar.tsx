import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PlusIcon, SearchIcon } from "lucide-react";
import React, { useCallback, useDeferredValue, useEffect, useRef } from "react";
import { UserProfileButton } from "@/components/auth/user-avatar";
import { Button } from "@/components/ui/button";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { useChatNav } from "@/hooks/use-chat-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInView } from "@/hooks/utils/use-intersection-observer";
import {
  ScrollEdgeProbe,
  useScrollEdges,
} from "@/hooks/utils/use-scroll-edges";
import { cn, useMergedRefs } from "@/lib/utils";
import { CollapsibleButtonGroup } from "../button-group-collapsible";
import { Tooltip } from "../tooltip";
import { ScrollbarZIndexHack } from "../utils/scrollbar-z-index-hack";
import { SpacerFrom } from "../utils/spacer";
import { Sidebar as BaseSidebar } from "./primitives/sidebar";
import { SidebarFooter } from "./primitives/sidebar-footer";
import { SidebarHeader } from "./primitives/sidebar-header";
import { SidebarInset } from "./primitives/sidebar-inset";
import { SidebarThreadItem } from "./primitives/sidebar-thread-item";

function MobileSidebarAutocloseLogic() {
  const { setOpenMobile } = useSidebar();
  const { id } = useChatNav();

  // biome-ignore lint/correctness/useExhaustiveDependencies: need reset on chat id change
  useEffect(() => {
    setOpenMobile(false);
  }, [setOpenMobile, id]);

  return null;
}

const SIDEBAR_STYLE = {
  "--duration-base": "200ms",
  // "--ease-default": "ease-out",
} as React.CSSProperties;

const SIDEBAR_VIRTUAL_OVERSCAN = 8;
const SIDEBAR_THREAD_ROW_GAP = 6;
const SIDEBAR_THREAD_ROW_HEIGHT = {
  mobile: 40,
  desktop: 36,
} as const;

function getSidebarThreadRowSize(isMobile: boolean) {
  return (
    (isMobile
      ? SIDEBAR_THREAD_ROW_HEIGHT.mobile
      : SIDEBAR_THREAD_ROW_HEIGHT.desktop) + SIDEBAR_THREAD_ROW_GAP
  );
}

export function Sidebar({
  className,
  activeThreadId,
  threads,
  children,
  onLoadMore,
  onNewChat,
}: {
  className?: string;
  activeThreadId?: string;
  threads: Doc<"threads">[];
  children: React.ReactNode;
  onNewChat?: () => void;
  onLoadMore?: () => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  // handle scroll edges intersect for UI tweaks
  const { isAtTop, isAtBottom, topRef, bottomRef } =
    useScrollEdges(scrollContainerRef);

  // handle lazy loading
  const handleLoadMore = useCallback(() => {
    onLoadMore?.();
  }, [onLoadMore]);
  const { ref: loadMoreRef } = useInView<HTMLDivElement>({
    rootRef: scrollContainerRef,
    rootMargin: "0px 0px 100% 0px",
    continuous: true,
    onEnter: handleLoadMore,
  });

  const mergedBottomRef = useMergedRefs<HTMLDivElement>(bottomRef, loadMoreRef);

  const deferredThreads = useDeferredValue(threads, []);

  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <BaseSidebar
        className={cn("p-0 contain-strict", className)}
        variant="inset"
      >
        <MySidebarHeader
          className="absolute top-0 z-50 w-full"
          isOverflowing={!isAtTop}
          onNewChat={onNewChat}
        />
        <SidebarContent
          className="gap-0 overscroll-contain p-0"
          ref={scrollContainerRef}
        >
          <ScrollEdgeProbe ref={topRef} />
          <MySidebarHeaderSpacer />
          <ScrollbarZIndexHack zIndex={51} />
          <SidebarGroup className="px-2">
            <SidebarGroupLabel>Previous Chats</SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarThreads
                activeThreadId={activeThreadId}
                isMobile={isMobile}
                scrollContainerRef={scrollContainerRef}
                threads={deferredThreads}
              />
            </SidebarGroupContent>
          </SidebarGroup>
          <MySidebarFooterSpacer />
          <ScrollEdgeProbe ref={mergedBottomRef} />
        </SidebarContent>
        <MySidebarFooter
          className="absolute bottom-0 z-50 w-full"
          isOverflowing={!isAtBottom}
        />
      </BaseSidebar>
      <CollapsibleButtonGroupAnimated className="fixed top-3 top-safe-offset-2 left-3" />
      <SidebarInset>{children}</SidebarInset>
      <MobileSidebarAutocloseLogic />
    </SidebarProvider>
  );
}

const SidebarThreads = React.memo(
  ({
    threads,
    activeThreadId,
    isMobile,
    scrollContainerRef,
  }: {
    threads: Doc<"threads">[];
    activeThreadId?: string;
    isMobile: boolean;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  }) => {
    const rowSize = getSidebarThreadRowSize(isMobile);
    const virtualizer = useVirtualizer({
      count: threads.length,
      estimateSize: () => rowSize,
      getItemKey: (index) => threads[index]?.uuid ?? index,
      getScrollElement: () => scrollContainerRef.current,
      overscan: SIDEBAR_VIRTUAL_OVERSCAN,
    });

    const virtualRows = virtualizer.getVirtualItems();
    const totalSize = Math.max(
      0,
      virtualizer.getTotalSize() - SIDEBAR_THREAD_ROW_GAP
    );

    return (
      <SidebarMenu
        className="relative select-none gap-0 overflow-hidden"
        style={{ height: totalSize }}
      >
        {virtualRows.map((virtualRow) => {
          const thread = threads[virtualRow.index];
          if (!thread) {
            return null;
          }

          return (
            <SidebarThreadItem
              className="absolute top-0 left-0 w-full"
              isActive={thread.uuid === activeThreadId}
              isMobile={isMobile}
              key={virtualRow.key}
              prerender={virtualRow.index < 25}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              thread={thread}
            />
          );
        })}
      </SidebarMenu>
    );
  }
);
SidebarThreads.displayName = "SidebarThreads";

function MySidebarHeader({
  isOverflowing = false,
  className,
  onNewChat,
}: {
  isOverflowing?: boolean;
  className?: string;
  onNewChat?: () => void;
}) {
  return (
    <SidebarHeader className={cn("", className)} isOverflowing={isOverflowing}>
      <h2 className="mt-0.5 h-full content-center text-center font-semibold text-lg">
        Isaaac.chat
      </h2>

      <div
        className={cn(
          "absolute top-3 top-safe-offset-2 right-3",
          "pointer-events-auto z-50 flex origin-left items-center gap-0.5 overflow-hidden rounded-sm p-1"
        )}
      >
        <Button
          className={cn("size-8")}
          onClick={onNewChat}
          size="icon"
          variant="ghost"
        >
          <PlusIcon className="size-4" />
          <span className="sr-only">New Chat</span>
        </Button>
      </div>
    </SidebarHeader>
  );
}

const MySidebarHeaderSpacer = React.memo(
  ({ className }: { className?: string }) => (
    <SpacerFrom>
      <MySidebarHeader className={className} />
    </SpacerFrom>
  )
);
MySidebarHeaderSpacer.displayName = "MySidebarHeaderSpacer";

function MySidebarFooter({
  isOverflowing = false,
  className,
}: {
  isOverflowing?: boolean;
  className?: string;
}) {
  return (
    <SidebarFooter className={className} isOverflowing={isOverflowing}>
      <UserProfileButton className="z-50 px-4" />
    </SidebarFooter>
  );
}

const MySidebarFooterSpacer = React.memo(
  ({ className }: { className?: string }) => (
    <SpacerFrom>
      <MySidebarFooter className={className} />
    </SpacerFrom>
  )
);
MySidebarFooterSpacer.displayName = "MySidebarFooterSpacer";

function CollapsibleButtonGroupAnimated({
  ...props
}: React.ComponentProps<typeof CollapsibleButtonGroup>) {
  // TODO: fix bug, isMobile is false then true, so it opens the button group (animation)
  const { open, isMobile } = useSidebar();
  const isDesktop = !isMobile;
  const isButtonGroupCollapsed = isDesktop && open;
  const { openNewChat } = useChatNav();

  return (
    <CollapsibleButtonGroup
      {...props}
      className={cn(
        "pointer-events-auto z-50 flex origin-left items-center gap-0.5 overflow-hidden rounded-sm bg-foreground/5 p-1 backdrop-blur-xs",
        props.className
      )}
      collapsed={isButtonGroupCollapsed}
      defaultCollapsed={false}
    >
      <Tooltip asChild isMobile={isMobile} tooltip="Toggle Sidebar">
        <SidebarTrigger className="size-8" />
      </Tooltip>
      <CollapsibleButtonGroup.CollapsibleContent>
        <Tooltip asChild isMobile={isMobile} tooltip="Search">
          <Button className="size-8" disabled variant="ghost">
            <SearchIcon className="size-4" />
            <span className="sr-only">Search (feature not available)</span>
          </Button>
        </Tooltip>
        <Tooltip asChild isMobile={isMobile} tooltip="New Chat">
          <Button className="size-8" onClick={openNewChat} variant="ghost">
            <PlusIcon className="size-4" />
            <span className="sr-only">New Chat</span>
          </Button>
        </Tooltip>
      </CollapsibleButtonGroup.CollapsibleContent>
    </CollapsibleButtonGroup>
  );
}
