import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import type React from "react";
import { useCallback, useState } from "react";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";
import { ScrollbarZIndexHack } from "@/components/ui-custom/utils/scrollbar-z-index-hack";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SidebarFloatingActions } from "./_parts/sidebar-floating-actions";
import { SidebarFooter, SidebarFooterSpacer } from "./_parts/sidebar-footer";
import { SidebarHeader, SidebarHeaderSpacer } from "./_parts/sidebar-header";
import { SidebarVirtualThreadList } from "./_parts/sidebar-virtual-thread-list";

export function ChatSidebarLayout({
  className,
  style,
  threads,
  children,
  onLoadMore,
  canLoadMore = false,
  isLoadingMore = false,
  onNewChat,
  sidebarFloatingActionsClassName,
  sidebarFloatingActionsStyle,
}: {
  className?: string;
  style?: React.CSSProperties;
  threads: Doc<"threads">[];
  children?: React.ReactNode;
  onLoadMore?: () => void;
  canLoadMore?: boolean;
  isLoadingMore?: boolean;
  onNewChat?: () => void;
  sidebarFloatingActionsClassName?: string;
  sidebarFloatingActionsStyle?: React.CSSProperties;
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
      <SidebarShell.Root className={className} style={style} variant="inset">
        <SidebarHeader
          className="absolute top-0 z-50 w-full"
          isOverflowing={!isAtTop}
          onNewChat={onNewChat}
        />
        <SidebarVirtualThreadList
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
        className={cn(
          "fixed top-3 top-safe-offset-2 left-3",
          sidebarFloatingActionsClassName
        )}
        onNewChat={onNewChat}
        style={sidebarFloatingActionsStyle}
      />

      <SidebarShell.Inset>{children}</SidebarShell.Inset>
    </SidebarShell.Provider>
  );
}
