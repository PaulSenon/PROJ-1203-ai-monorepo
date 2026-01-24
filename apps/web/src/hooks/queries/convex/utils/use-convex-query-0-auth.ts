import type {
  OptionalRestArgsOrSkip,
  PaginatedQueryArgs,
  PaginatedQueryReference,
  RequestForQueries,
  UsePaginatedQueryReturnType,
} from "convex/react";
import { useQuery as useConvexQueryNoCache } from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import {
  usePaginatedQuery as useConvexPaginatedQueryCached,
  useQueries as useConvexQueriesCached,
  useQuery as useConvexQueryCached,
} from "convex-helpers/react/cache/hooks";
import { useAuth } from "@/hooks/use-auth";

export function useCvxQueryAuthNoCache<
  Query extends FunctionReference<"query">,
>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const { isReadyToUseConvex } = useAuth();

  const result = useConvexQueryNoCache(
    query,
    ...(isReadyToUseConvex ? queryArgs : ["skip"])
  );

  return result;
}

/**
 * Add auth check to convex query hooks
 */
export function useCvxQueryAuthCached<Query extends FunctionReference<"query">>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const { isReadyToUseConvex } = useAuth();

  const result = useConvexQueryCached(
    query,
    ...(isReadyToUseConvex ? queryArgs : ["skip"])
  );

  return result;
}

export function useCvxPaginatedQueryAuthCached<
  Query extends PaginatedQueryReference,
>(
  query: Query,
  args: PaginatedQueryArgs<Query> | "skip",
  options: {
    initialNumItems: number;
    // latestPageSize?: "grow" | "fixed";
  }
): UsePaginatedQueryReturnType<Query> {
  const { isReadyToUseConvex } = useAuth();
  const result = useConvexPaginatedQueryCached(
    query,
    isReadyToUseConvex ? args : "skip",
    options
  );

  return result;
}

// TODO: also do cache for queries
export function useCvxQueriesAuthCached(
  queries: RequestForQueries
  // biome-ignore lint/suspicious/noExplicitAny: needed any
): Record<string, any | undefined | Error> {
  const { isReadyToUseConvex } = useAuth();
  const results = useConvexQueriesCached(isReadyToUseConvex ? queries : {});
  return results;
}
