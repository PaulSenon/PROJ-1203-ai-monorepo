import {
  type OptionalRestArgsOrSkip,
  type PaginatedQueryArgs,
  type PaginatedQueryReference,
  type UsePaginatedQueryReturnType,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import { useAuth } from "@/hooks/use-auth";

/**
 * Add auth check to convex query hooks
 */
export function useQueryBase<Query extends FunctionReference<"query">>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const { isFullyReady } = useAuth();
  const result = useQuery(query, ...(isFullyReady ? queryArgs : ["skip"]));

  return result;
}

export function usePaginatedQueryBase<Query extends PaginatedQueryReference>(
  query: Query,
  args: PaginatedQueryArgs<Query> | "skip",
  options: {
    initialNumItems: number;
    // latestPageSize?: "grow" | "fixed";
  }
): UsePaginatedQueryReturnType<Query> {
  const { isFullyReady } = useAuth();
  const result = usePaginatedQuery(
    query,
    isFullyReady ? args : "skip",
    options
  );

  return result;
}
