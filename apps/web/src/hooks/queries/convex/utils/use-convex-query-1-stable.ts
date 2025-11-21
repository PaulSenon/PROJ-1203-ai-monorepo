/**
 * Add stability to convex query hooks
 * e.g. don't blink ui when refetching in background
 */

import type {
  OptionalRestArgsOrSkip,
  PaginatedQueryArgs,
  PaginatedQueryReference,
  UsePaginatedQueryReturnType,
} from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import { useMemo, useRef } from "react";
import {
  useCvxPaginatedQueryAuth,
  useCvxQueryAuth,
} from "./use-convex-query-0-auth";

export function useCvxQueryStable<Query extends FunctionReference<"query">>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const result = useCvxQueryAuth(query, ...queryArgs);
  const stored = useRef(result);

  if (result !== undefined) {
    stored.current = result;
  }
  return stored.current;
}

export function useCvxPaginatedQueryStable<
  Query extends PaginatedQueryReference,
>(
  query: Query,
  args: PaginatedQueryArgs<Query> | "skip",
  options: {
    initialNumItems: number;
    // latestPageSize?: "grow" | "fixed";
  }
): UsePaginatedQueryReturnType<Query> & { isPending: boolean } {
  const res = useCvxPaginatedQueryAuth(query, args, options);

  const stored = useRef(res.results);

  if (res.status !== "LoadingFirstPage") {
    stored.current = res.results;
  }

  return useMemo(
    () =>
      ({
        isLoading: res.isLoading,
        loadMore: res.loadMore,
        results: stored.current,
        status: res.status,
        isPending: res.status === "LoadingFirstPage",
      }) as UsePaginatedQueryReturnType<Query> & { isPending: boolean },
    [res.isLoading, res.loadMore, res.status]
  );
}
