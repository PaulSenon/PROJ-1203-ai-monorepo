"use client";

import { useCallback, useLayoutEffect, useMemo } from "react";
import { Sidebar } from "@/components/ui-custom/sidebar/sidebar";
import { usePreviousThreadHistoryPaginated } from "@/hooks/queries/use-chat-listing-queries";
import { useAppLoadStatusActions } from "@/hooks/use-app-load-status";
import { useChatNav } from "@/hooks/use-chat-nav";

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

  const history = usePreviousThreadHistoryPaginated();

  useLayoutEffect(() => {
    if (history.isPending) return;
    appUiStatus.setSidebarUIReady();
  }, [history.isPending, appUiStatus.setSidebarUIReady]);

  const handleLoadMore = useCallback(() => {
    history.loadMore(20);
  }, [history.loadMore]);

  const handleNewChat = useCallback(() => {
    chatNav.openNewChat();
  }, [chatNav.openNewChat]);

  const memoThreads = useMemo(
    () => history.results.filter((t) => t.lifecycleState === "active"),
    [history.results]
  );

  return (
    <Sidebar
      activeThreadId={chatNav.id}
      className={className}
      onLoadMore={handleLoadMore}
      onNewChat={handleNewChat}
      threads={memoThreads}
    >
      {children}
    </Sidebar>
  );
}
