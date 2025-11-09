import { cvx } from "@/lib/convex/queries";
import { useCvxPaginatedQueryCached } from "./queries/convex/utils/use-convex-query-2-cached";

export function usePreviousThreadHistory() {
  return useCvxPaginatedQueryCached(
    ...cvx.query.threadHistoryPaginated.options.neverSkip()
  );
}
