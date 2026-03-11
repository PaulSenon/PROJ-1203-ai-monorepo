"use client";

import type { CSSProperties } from "react";
import { useCallback, useMemo } from "react";
import {
  useAppReadySignalOnLayoutEffect,
  useAppReadyUiDestination,
} from "@/hooks/use-app-ready";
import {
  useActiveSidebarThreadId,
  useChatNavActions,
} from "@/hooks/use-chat-nav";
import { cn } from "@/lib/utils";
import { useMobileSidebarAutoclose } from "./_hooks/use-mobile-sidebar-autoclose";
import { useSidebarThreads } from "./_hooks/use-sidebar-threads";
import { ChatSidebarLayout } from "./sidebar-layout";

function MobileSidebarAutoclose() {
  const activeThreadId = useActiveSidebarThreadId();
  useMobileSidebarAutoclose(activeThreadId);
  return null;
}

export function ChatSidebar({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { openNewChat } = useChatNavActions();

  const sidebarThreads = useSidebarThreads();
  const sidebarDestination = useAppReadyUiDestination("sidebar-content");
  const sidebarFloatingActionsDestination = useAppReadyUiDestination(
    "sidebar-floating-actions"
  );

  useAppReadySignalOnLayoutEffect("sidebar-thread-history-layout", {
    skip: sidebarThreads.isPending,
  });

  const sidebarContentClassName = cn(
    className,
    "transition-opacity",
    sidebarDestination.phase === "hidden" && "pointer-events-none opacity-0",
    sidebarDestination.phase !== "hidden" && "opacity-100"
  );

  const sidebarContentStyle: CSSProperties = useMemo(
    () => ({
      transitionDuration: `${sidebarDestination.transition.durationMs}ms`,
      transitionTimingFunction: sidebarDestination.transition.easing,
    }),
    [sidebarDestination.transition]
  );

  const sidebarFloatingActionsClassName = cn(
    "transition-opacity",
    sidebarFloatingActionsDestination.phase === "hidden" &&
      "pointer-events-none opacity-0",
    sidebarFloatingActionsDestination.phase !== "hidden" && "opacity-100"
  );

  const sidebarFloatingActionsStyle: CSSProperties = useMemo(
    () => ({
      transitionDuration: `${sidebarFloatingActionsDestination.transition.durationMs}ms`,
      transitionTimingFunction:
        sidebarFloatingActionsDestination.transition.easing,
    }),
    [sidebarFloatingActionsDestination.transition]
  );

  const handleNewChat = useCallback(() => {
    openNewChat();
  }, [openNewChat]);

  return (
    <ChatSidebarLayout
      canLoadMore={sidebarThreads.canLoadMore}
      className={sidebarContentClassName}
      isLoadingMore={sidebarThreads.isLoadingMore}
      onLoadMore={sidebarThreads.loadMore}
      onNewChat={handleNewChat}
      sidebarFloatingActionsClassName={sidebarFloatingActionsClassName}
      sidebarFloatingActionsStyle={sidebarFloatingActionsStyle}
      style={sidebarContentStyle}
      threads={sidebarThreads.threads}
    >
      {children}
      <MobileSidebarAutoclose />
    </ChatSidebarLayout>
  );
}
