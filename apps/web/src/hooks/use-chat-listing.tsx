import { api } from "@ai-monorepo/convex/convex/_generated/api";
import { usePaginatedQuery } from "convex/react";

export function usePreviousThreadHistory() {
  const { isLoading, loadMore, results, status } = usePaginatedQuery(
    api.chat.getThreadsForListing,
    {},
    {
      initialNumItems: 50,
    }
  );

  return {
    isLoading,
    loadMore,
    results,
    status,
  };
}
