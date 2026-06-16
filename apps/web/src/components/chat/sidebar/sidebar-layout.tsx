import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import React, { useCallback, useEffect, useState } from "react";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";
import { ScrollbarZIndexHack } from "@/components/ui-custom/utils/scrollbar-z-index-hack";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebugInpLogger } from "@/hooks/utils/use-debug-inp";
import { cn } from "@/lib/utils";
import { SidebarFloatingActions } from "./_parts/sidebar-floating-actions";
import { SidebarFooter, SidebarFooterSpacer } from "./_parts/sidebar-footer";
import { SidebarHeader, SidebarHeaderSpacer } from "./_parts/sidebar-header";
import { SidebarVirtualThreadList } from "./_parts/sidebar-virtual-thread-list";

export const INP_DATA_ATTRIBUTE = "data-inp-action";
function getKey(target: Element) {
  const id = target.getAttribute(INP_DATA_ATTRIBUTE);
  return `INP-${id}`;
}
const ENTRY_TYPES = ["pointerdown"];

export const ChatSidebarLayout = React.memo(function _ChatSidebarLayout({
  className,
  style,
  threads,
  children,
  onLoadMore,
  onLayoutReady,
  canLoadMore = false,
  isLoadingMore = false,
  onNewChat,
  sidebarFloatingActionsClassName,
  sidebarFloatingActionsStyle,
  currentThreadUuid,
}: {
  currentThreadUuid: string;
  className?: string;
  style?: React.CSSProperties;
  threads: Doc<"threads">[];
  children?: React.ReactNode;
  onLoadMore?: () => void;
  onLayoutReady?: () => void;
  canLoadMore?: boolean;
  isLoadingMore?: boolean;
  onNewChat?: () => void;
  sidebarFloatingActionsClassName?: string;
  sidebarFloatingActionsStyle?: React.CSSProperties;
}) {
  const isMobile = useIsMobile();
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useDebugInpLogger({
    getKey,
    querySelector: `[${INP_DATA_ATTRIBUTE}]`,
    entryTypes: ENTRY_TYPES,
  });

  //! Important: because in mobile, the list is not rendered we need to trigger ready signal asap
  useEffect(() => {
    if (!isMobile) return;
    onLayoutReady?.();
  }, [isMobile, onLayoutReady]);

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
          activeThreadUuid={currentThreadUuid}
          canLoadMore={canLoadMore}
          footer={listFooter}
          header={listHeader}
          isLoadingMore={isLoadingMore}
          isMobile={isMobile}
          onEdgeStateChange={setEdgeState}
          onLayoutReady={onLayoutReady}
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
});
