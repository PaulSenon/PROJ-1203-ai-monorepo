"use client";

import { useCallback, useLayoutEffect } from "react";
import { useAppLoadStatusActions } from "@/hooks/use-app-load-status";
import { useChatNav } from "@/hooks/use-chat-nav";
import { useSidebarThreads } from "./_hooks/use-sidebar-threads";
import { ChatSidebarLayout } from "./sidebar-layout";

export function ChatSidebar({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const appUiStatus = useAppLoadStatusActions();
  // const { isInitialUIStateReady } = useAppLoadStatus();
  const chatNav = useChatNav();
  // const handleNewChat = () => chatNav.openNewChat();
  // TODO: debug

  const sidebarThreads = useSidebarThreads();

  useLayoutEffect(() => {
    if (sidebarThreads.isPending) return;
    appUiStatus.setSidebarUIReady();
  }, [sidebarThreads.isPending, appUiStatus.setSidebarUIReady]);

  const handleNewChat = useCallback(() => {
    chatNav.openNewChat();
  }, [chatNav.openNewChat]);

  return (
    <ChatSidebarLayout
      activeThreadId={chatNav.id}
      className={className}
      onLoadMore={sidebarThreads.loadMore}
      onNewChat={handleNewChat}
      threads={sidebarThreads.threads}
    >
      {children}
    </ChatSidebarLayout>
  );
}
