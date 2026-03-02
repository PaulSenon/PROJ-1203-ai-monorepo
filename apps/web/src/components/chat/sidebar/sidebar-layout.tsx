import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { PlusIcon, SearchIcon } from "lucide-react";
import React, { useCallback, useDeferredValue, useRef } from "react";
import { UserProfileButton } from "@/components/auth/user-avatar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { CollapsibleButtonGroup } from "@/components/ui-custom/button-group-collapsible";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";
import { Tooltip } from "@/components/ui-custom/tooltip";
import { ScrollbarZIndexHack } from "@/components/ui-custom/utils/scrollbar-z-index-hack";
import { SpacerFrom } from "@/components/ui-custom/utils/spacer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInView } from "@/hooks/utils/use-intersection-observer";
import {
  ScrollEdgeProbe,
  useScrollEdges,
} from "@/hooks/utils/use-scroll-edges";
import { cn, useMergedRefs } from "@/lib/utils";
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
    rootMargin: "0px 0px 100% 0px",
    continuous: true,
    onEnter: handleLoadMore,
  });

  const mergedBottomRef = useMergedRefs<HTMLDivElement>(bottomRef, loadMoreRef);
  const deferredThreads = useDeferredValue(threads, []);

  return (
    <SidebarShell.Provider>
      <SidebarShell.Root className={className} variant="inset">
        <ChatSidebarHeader isOverflowing={!isAtTop} onNewChat={onNewChat} />
        <SidebarShell.Content ref={scrollContainerRef}>
          <ScrollEdgeProbe ref={topRef} />
          <ChatSidebarHeaderSpacer />
          <ScrollbarZIndexHack zIndex={51} />
          <SidebarShell.Group>
            <SidebarShell.GroupLabel>Previous Chats</SidebarShell.GroupLabel>
            <SidebarShell.GroupContent>
              <SidebarShell.Menu>
                {deferredThreads.map((thread) => (
                  <ThreadItem.Root
                    isActive={thread.uuid === activeThreadId}
                    isMobile={isMobile}
                    key={thread.uuid}
                    thread={thread}
                  />
                ))}
              </SidebarShell.Menu>
            </SidebarShell.GroupContent>
          </SidebarShell.Group>
          <ChatSidebarFooterSpacer />
          <ScrollEdgeProbe ref={mergedBottomRef} />
        </SidebarShell.Content>
        <ChatSidebarFooter isOverflowing={!isAtBottom} />
      </SidebarShell.Root>

      <SidebarFloatingActions
        className="fixed top-3 top-safe-offset-2 left-3"
        onNewChat={onNewChat}
      />

      <SidebarShell.Inset>{children}</SidebarShell.Inset>
    </SidebarShell.Provider>
  );
}

function ChatSidebarHeader({
  isOverflowing,
  className,
  onNewChat,
}: {
  isOverflowing: boolean;
  className?: string;
  onNewChat?: () => void;
}) {
  return (
    <SidebarShell.Header className={className} isOverflowing={isOverflowing}>
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
          className="size-8"
          onClick={onNewChat}
          size="icon"
          variant="ghost"
        >
          <PlusIcon className="size-4" />
          <span className="sr-only">New Chat</span>
        </Button>
      </div>
    </SidebarShell.Header>
  );
}

const ChatSidebarHeaderSpacer = React.memo(
  ({ className }: { className?: string }) => (
    <SpacerFrom>
      <ChatSidebarHeader className={className} isOverflowing={false} />
    </SpacerFrom>
  )
);
ChatSidebarHeaderSpacer.displayName = "ChatSidebarHeaderSpacer";

function ChatSidebarFooter({
  isOverflowing,
  className,
}: {
  isOverflowing: boolean;
  className?: string;
}) {
  return (
    <SidebarShell.Footer className={className} isOverflowing={isOverflowing}>
      <UserProfileButton className="z-50 px-4" />
    </SidebarShell.Footer>
  );
}

const ChatSidebarFooterSpacer = React.memo(
  ({ className }: { className?: string }) => (
    <SpacerFrom>
      <ChatSidebarFooter className={className} isOverflowing={false} />
    </SpacerFrom>
  )
);
ChatSidebarFooterSpacer.displayName = "ChatSidebarFooterSpacer";

function SidebarFloatingActions({
  onNewChat,
  ...props
}: React.ComponentProps<typeof CollapsibleButtonGroup> & {
  onNewChat?: () => void;
}) {
  const { open, isMobile } = useSidebar();
  const isButtonGroupCollapsed = !isMobile && open;

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
        <SidebarShell.Trigger />
      </Tooltip>

      <CollapsibleButtonGroup.CollapsibleContent>
        <Tooltip asChild isMobile={isMobile} tooltip="Search">
          <Button className="size-8" disabled variant="ghost">
            <SearchIcon className="size-4" />
            <span className="sr-only">Search (feature not available)</span>
          </Button>
        </Tooltip>

        <Tooltip asChild isMobile={isMobile} tooltip="New Chat">
          <Button className="size-8" onClick={onNewChat} variant="ghost">
            <PlusIcon className="size-4" />
            <span className="sr-only">New Chat</span>
          </Button>
        </Tooltip>
      </CollapsibleButtonGroup.CollapsibleContent>
    </CollapsibleButtonGroup>
  );
}
