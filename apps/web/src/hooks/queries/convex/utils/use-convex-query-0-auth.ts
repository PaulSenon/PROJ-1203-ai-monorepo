import type {
  OptionalRestArgsOrSkip,
  PaginatedQueryArgs,
  PaginatedQueryReference,
  RequestForQueries,
  UsePaginatedQueryReturnType,
} from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import {
  usePaginatedQuery,
  useQueries,
  useQuery,
} from "convex-helpers/react/cache/hooks";
import { useAuth } from "@/hooks/use-auth";

/**
 * Add auth check to convex query hooks
 */
export function useCvxQueryAuth<Query extends FunctionReference<"query">>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const { isReadyToUseConvex } = useAuth();

  const result = useQuery(
    query,
    ...(isReadyToUseConvex ? queryArgs : ["skip"])
  );

  return result;
}

export function useCvxPaginatedQueryAuth<Query extends PaginatedQueryReference>(
  query: Query,
  args: PaginatedQueryArgs<Query> | "skip",
  options: {
    initialNumItems: number;
    // latestPageSize?: "grow" | "fixed";
  }
): UsePaginatedQueryReturnType<Query> {
  const { isReadyToUseConvex } = useAuth();
  const result = usePaginatedQuery(
    query,
    isReadyToUseConvex ? args : "skip",
    options
  );

  return result;
}

// TODO: also do cache for queries
export function useCvxQueriesAuth(
  queries: RequestForQueries
  // biome-ignore lint/suspicious/noExplicitAny: needed any
): Record<string, any | undefined | Error> {
  const { isReadyToUseConvex } = useAuth();
  const results = useQueries(isReadyToUseConvex ? queries : {});
  return results;
}
