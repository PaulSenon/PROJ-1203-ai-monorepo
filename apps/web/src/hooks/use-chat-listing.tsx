import { cvx } from "@/lib/convex/queries";
import { usePaginatedQueryStable } from "./queries/convex/utils/use-convex-query-1-stable";

export function usePreviousThreadHistory() {
  const { isLoading, loadMore, results, status } = usePaginatedQueryStable(
    ...cvx.query.threadHistoryPaginated.options.neverSkip()
  );

  return {
    isLoading,
    loadMore,
    results,
    status,
  };
}
