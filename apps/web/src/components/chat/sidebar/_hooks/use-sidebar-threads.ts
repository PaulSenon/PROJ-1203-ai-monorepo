import { useCallback, useMemo } from "react";
import { usePreviousThreadHistoryPaginated } from "@/hooks/queries/use-chat-listing-queries";

const SIDEBAR_THREADS_PAGE_SIZE = 20;

export type SidebarThreadsLoadMoreStatus = ReturnType<
  typeof usePreviousThreadHistoryPaginated
>["status"];

export function useSidebarThreads() {
  const history = usePreviousThreadHistoryPaginated();

  const loadMore = useCallback(() => {
    history.loadMore(SIDEBAR_THREADS_PAGE_SIZE);
  }, [history.loadMore]);

  const threads = useMemo(
    () =>
      history.results.filter((thread) => thread.lifecycleState === "active"),
    [history.results]
  );

  return {
    isPending: history.isPending,
    loadMoreStatus: history.status,
    loadMore,
    threads,
  };
}
