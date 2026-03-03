import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import type React from "react";
import { useCallback, useState } from "react";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";
import { ScrollbarZIndexHack } from "@/components/ui-custom/utils/scrollbar-z-index-hack";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarFloatingActions } from "./_parts/sidebar-floating-actions";
import { SidebarFooter, SidebarFooterSpacer } from "./_parts/sidebar-footer";
import { SidebarHeader, SidebarHeaderSpacer } from "./_parts/sidebar-header";
import { SidebarVirtualThreadList } from "./_parts/sidebar-virtual-thread-list";

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
  threads: Doc<"threads">[];
  children?: React.ReactNode;
  onLoadMore?: () => void;
  canLoadMore?: boolean;
  isLoadingMore?: boolean;
  onNewChat?: () => void;
}) {
  const isMobile = useIsMobile();
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

  const listHeader = (
    <>
      <SidebarHeaderSpacer />
      <ScrollbarZIndexHack zIndex={51} />
      <div className="px-2 pt-2">
        <SidebarShell.GroupLabel>Previous Chats</SidebarShell.GroupLabel>
      </div>
    </>
  );

  const listFooter = <SidebarFooterSpacer />;

  return (
    <SidebarShell.Provider>
      <SidebarShell.Root className={className} variant="inset">
        <SidebarHeader
          className="absolute top-0 z-50 w-full"
          isOverflowing={!isAtTop}
          onNewChat={onNewChat}
        />
        <SidebarVirtualThreadList
          activeThreadId={activeThreadId}
          canLoadMore={canLoadMore}
          footer={listFooter}
          header={listHeader}
          isLoadingMore={isLoadingMore}
          isMobile={isMobile}
          onEdgeStateChange={setEdgeState}
          onLoadMore={onLoadMore}
          threads={threads}
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
