"use client";

import { useCallback, useLayoutEffect } from "react";
import { useAppLoadStatusActions } from "@/hooks/use-app-load-status";
import { useChatNav } from "@/hooks/use-chat-nav";
import { useMobileSidebarAutoclose } from "./_hooks/use-mobile-sidebar-autoclose";
import { useSidebarThreads } from "./_hooks/use-sidebar-threads";
import { ChatSidebarLayout } from "./sidebar-layout";

function MobileSidebarAutoclose({
  threadIdentity,
}: {
  threadIdentity: string;
}) {
  useMobileSidebarAutoclose(threadIdentity);
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
  const chatNav = useChatNav();
  const threadIdentity = chatNav.isNew ? "__new__" : chatNav.id;

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
      canLoadMore={sidebarThreads.canLoadMore}
      className={className}
      isLoadingMore={sidebarThreads.isLoadingMore}
      onLoadMore={sidebarThreads.loadMore}
      onNewChat={handleNewChat}
      threads={sidebarThreads.threads}
    >
      {children}
      <MobileSidebarAutoclose threadIdentity={threadIdentity} />
    </ChatSidebarLayout>
  );
}
