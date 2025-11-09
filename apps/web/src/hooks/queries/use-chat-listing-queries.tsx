import { cvx } from "@/lib/convex/queries";
import { useCvxPaginatedQueryCached } from "./convex/utils/use-convex-query-2-cached";

export function usePreviousThreadHistoryPaginated() {
  return useCvxPaginatedQueryCached(
    ...cvx.query.threadHistoryPaginated({}).options.neverSkip()
  );
}
