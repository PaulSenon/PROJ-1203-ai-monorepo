import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePreviousThreadHistoryPaginated } from "@/hooks/queries/use-chat-listing-queries";

const SIDEBAR_THREADS_PAGE_SIZE = 20;

export function useSidebarThreads() {
  const history = usePreviousThreadHistoryPaginated();
  const hasQueuedLoadMoreRef = useRef(false);
  const hasRequestedInCurrentCanLoadMoreStateRef = useRef(false);

  const loadMoreStatus = history.status;

  const loadMore = useCallback(() => {
    if (loadMoreStatus === "LoadingMore") {
      hasQueuedLoadMoreRef.current = true;
      return;
    }

    if (loadMoreStatus !== "CanLoadMore") return;
    if (hasRequestedInCurrentCanLoadMoreStateRef.current) return;

    hasRequestedInCurrentCanLoadMoreStateRef.current = true;
    history.loadMore(SIDEBAR_THREADS_PAGE_SIZE);
  }, [loadMoreStatus, history.loadMore]);

  useEffect(() => {
    if (loadMoreStatus !== "CanLoadMore") {
      hasRequestedInCurrentCanLoadMoreStateRef.current = false;
    }

    if (loadMoreStatus === "CanLoadMore" && hasQueuedLoadMoreRef.current) {
      hasQueuedLoadMoreRef.current = false;
      loadMore();
      return;
    }

    if (loadMoreStatus === "Exhausted") {
      hasQueuedLoadMoreRef.current = false;
    }
  }, [loadMoreStatus, loadMore]);

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
