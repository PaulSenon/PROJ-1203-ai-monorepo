"use client";

import { type CSSProperties, useCallback, useMemo } from "react";
import {
  useAppReadySignalAction,
  useAppReadyState,
} from "@/hooks/chat/app-ready/app-ready-visibility";
import { useChatNav, useChatNavActions } from "@/hooks/chat/use-chat-nav";
import { cn } from "@/lib/utils";
import { useMobileSidebarAutoclose } from "./_hooks/use-mobile-sidebar-autoclose";
import { useSidebarThreads } from "./_hooks/use-sidebar-threads";
import { ChatSidebarLayout } from "./sidebar-layout";

function MobileSidebarAutoclose() {
  const { currentThreadUuid } = useChatNav();
  useMobileSidebarAutoclose(currentThreadUuid);
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
  const { currentThreadUuid } = useChatNav();

  const sidebarThreads = useSidebarThreads();
  // TODO: not this
  const transition = useAppReadyState("sidebar");
  const { markReady } = useAppReadySignalAction({
    checkpoint: "sidebar-layout",
  });

  const sidebarContentClassName = cn(
    className,
    "transition-opacity",
    transition.hidden ? "pointer-events-none opacity-0" : "opacity-100"
  );

  const sidebarContentStyle: CSSProperties = useMemo(
    () => ({
      transitionDuration: `${transition.durationMs}ms`,
      transitionTimingFunction: transition.easing,
    }),
    [transition.durationMs, transition.easing]
  );

  const sidebarFloatingActionsClassName = cn(
    "transition-opacity",
    transition.hidden ? "pointer-events-none opacity-0" : "opacity-100"
  );

  const sidebarFloatingActionsStyle: CSSProperties = useMemo(
    () => ({
      transitionDuration: `${transition.durationMs}ms`,
      transitionTimingFunction: transition.easing,
    }),
    [transition.durationMs, transition.easing]
  );

  const handleNewChat = useCallback(() => {
    openNewChat();
  }, [openNewChat]);

  return (
    <ChatSidebarLayout
      canLoadMore={sidebarThreads.canLoadMore}
      className={sidebarContentClassName}
      currentThreadUuid={currentThreadUuid}
      isLoadingMore={sidebarThreads.isLoadingMore}
      onLayoutReady={markReady}
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
