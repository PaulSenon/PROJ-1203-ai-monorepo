import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { PlusIcon, SearchIcon } from "lucide-react";
import React, { useCallback, useDeferredValue, useRef } from "react";
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

const SIDEBAR_STYLE = {
  "--duration-base": "200ms",
  // "--ease-default": "ease-out",
} as React.CSSProperties;
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
    </SidebarProvider>
  );
}

const SidebarThreads = React.memo(
  ({
    threads,
    activeThreadId,
    isMobile,
  }: {
    threads: Doc<"threads">[];
    activeThreadId?: string;
    isMobile: boolean;
  }) => (
    <SidebarMenu className="select-none gap-1.5">
      {threads.map((thread, index) => (
        <SidebarThreadItem
          isActive={thread.uuid === activeThreadId}
          isMobile={isMobile}
          key={thread.uuid}
          prerender={index < 25}
          thread={thread}
        />
      ))}
    </SidebarMenu>
  )
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
