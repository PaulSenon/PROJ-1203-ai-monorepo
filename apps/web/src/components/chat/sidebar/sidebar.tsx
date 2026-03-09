"use client";

import { useCallback, useLayoutEffect } from "react";
import { useAppLoadStatusActions } from "@/hooks/use-app-load-status";
import {
  useActiveSidebarThreadId,
  useChatNavActions,
} from "@/hooks/use-chat-nav";
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
  const appUiStatus = useAppLoadStatusActions();
  const { openNewChat } = useChatNavActions();

  const sidebarThreads = useSidebarThreads();

  useLayoutEffect(() => {
    if (sidebarThreads.isPending) return;
    appUiStatus.setSidebarUIReady();
  }, [sidebarThreads.isPending, appUiStatus.setSidebarUIReady]);

  const handleNewChat = useCallback(() => {
    openNewChat();
  }, [openNewChat]);

  return (
    <ChatSidebarLayout
      canLoadMore={sidebarThreads.canLoadMore}
      className={className}
      isLoadingMore={sidebarThreads.isLoadingMore}
      onLoadMore={sidebarThreads.loadMore}
      onNewChat={handleNewChat}
      threads={sidebarThreads.threads}
    >
      {children}
      <MobileSidebarAutoclose />
    </ChatSidebarLayout>
  );
}
