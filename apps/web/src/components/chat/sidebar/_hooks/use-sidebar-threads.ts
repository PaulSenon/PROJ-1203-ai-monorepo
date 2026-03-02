import { useCallback, useMemo } from "react";
import { usePreviousThreadHistoryPaginated } from "@/hooks/queries/use-chat-listing-queries";

const SIDEBAR_THREADS_PAGE_SIZE = 20;

export function useSidebarThreads() {
  const history = usePreviousThreadHistoryPaginated();

  const loadMore = useCallback(() => {
    if (history.status !== "CanLoadMore") return;
    history.loadMore(SIDEBAR_THREADS_PAGE_SIZE);
  }, [history.status, history.loadMore]);

  const threads = useMemo(
    () =>
      history.results.filter((thread) => thread.lifecycleState === "active"),
    [history.results]
  );

  return {
    isPending: history.isPending,
    loadMore,
    threads,
  };
}
