/**
 * Add cold persistent local caching to convex query hooks for instant
 * stale when page is reloaded
 */
/**
 * Add stability to convex query hooks
 * e.g. don't blink ui when refetching in background
 */

import type {
  OptionalRestArgsOrSkip,
  PaginatedQueryArgs,
  PaginatedQueryItem,
  PaginatedQueryReference,
} from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import { useEffect, useMemo } from "react";
import z from "zod";
import { useUserCacheEntryOnce } from "@/hooks/use-user-cache";
import { createQueryKey } from "@/lib/convex/helpers";
import {
  useCvxPaginatedQueryStable,
  useCvxQueryStable,
} from "./use-convex-query-1-stable";

export function useCvxQueryCached<Query extends FunctionReference<"query">>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): {
  data: FunctionReturnType<Query> | undefined;
  isPending: boolean;
  isStale: boolean;
} {
  const isSkip = queryArgs[0] === "skip";

  // Cache
  const keyString = [
    "tsQueryCached",
    "cvxQueryCached",
    createQueryKey(query, queryArgs),
  ].join(":");
  const cacheEntry =
    useUserCacheEntryOnce<FunctionReturnType<Query>>(keyString);

  // Query
  const convexQueryResult = useCvxQueryStable(query, ...queryArgs);
  const convexIsPending = convexQueryResult === undefined;

  // Cache persistence
  useEffect(() => {
    if (isSkip || convexIsPending) return;
    // only persist when data loaded / non skipped / non nullish
    if (convexQueryResult) cacheEntry.set(convexQueryResult);
    // otherwise delete cache to save space (better storing nothing than null)
    // TODO !!!! maybe we DO want to store null to have cached response on empty result
    if (convexQueryResult === null) cacheEntry.del();
  }, [
    isSkip,
    convexIsPending,
    convexQueryResult,
    cacheEntry.set,
    cacheEntry.del,
  ]);

  // Result with fallback on cache
  const data = useMemo(() => {
    if (isSkip) return;
    if (!convexIsPending) return convexQueryResult;
    if (!cacheEntry.isPending) return cacheEntry.snapshot;
    return;
  }, [
    isSkip,
    convexIsPending,
    cacheEntry.isPending,
    convexQueryResult,
    cacheEntry.snapshot,
  ]);
  const isStale = useMemo(() => {
    if (isSkip) return false;
    if (!convexIsPending) return false;
    if (cacheEntry.isPending) return false;
    return true;
  }, [isSkip, convexIsPending, cacheEntry.isPending]);
  const isPending = useMemo(() => {
    if (isSkip) return true;
    if (cacheEntry.isPending) return true;
    if (!cacheEntry.snapshot && convexIsPending) return true;
    return false;
  }, [isSkip, cacheEntry.isPending, convexIsPending, cacheEntry.snapshot]);

  return useMemo(
    () => ({
      data,
      isPending,
      isStale,
    }),
    [data, isPending, isStale]
  );
}

export function useCvxPaginatedQueryCached<
  Query extends PaginatedQueryReference,
>(
  query: Query,
  args: PaginatedQueryArgs<Query> | "skip",
  options: {
    initialNumItems: number;
    // latestPageSize?: "grow" | "fixed";
  }
) {
  // UsePaginatedQueryReturnType<Query>
  const isSkip = args === "skip";
  const argsObject = isSkip ? {} : args;

  // Cache
  const keyString = useMemo(
    () =>
      [
        "tsQueryCached",
        "cvxQueryCached",
        createQueryKey(query, {
          ...argsObject,
          paginationOpts: {
            numItems: options.initialNumItems,
            cursor: null,
          },
        }),
      ].join(":"),
    [query, argsObject, options.initialNumItems]
  );
  const cacheEntry = useUserCacheEntryOnce<PaginatedQueryItem<Query>[]>(
    keyString,
    z.array(z.any())
  );

  // Query
  const convexQueryResult = useCvxPaginatedQueryStable(query, args, options);
  const convexIsPending = convexQueryResult.status === "LoadingFirstPage";

  // Cache persistence
  useEffect(() => {
    if (isSkip || convexIsPending) return;
    // this only cache the first page (initialNumItems)
    if (
      convexQueryResult.results.length > 0 &&
      convexQueryResult.results.length <= options.initialNumItems
    ) {
      cacheEntry.set(convexQueryResult.results);
    }
    if (convexQueryResult.results.length === 0) cacheEntry.del();
  }, [
    isSkip,
    convexIsPending,
    convexQueryResult,
    cacheEntry.set,
    cacheEntry.del,
    options.initialNumItems,
  ]);

  // Result with fallback on cache
  const results = useMemo(() => {
    if (isSkip) return [];
    if (!convexIsPending) return convexQueryResult.results;
    if (!cacheEntry.isPending) return cacheEntry.snapshot ?? [];
    return [];
  }, [
    isSkip,
    convexIsPending,
    cacheEntry.isPending,
    cacheEntry.snapshot,
    convexQueryResult.results,
  ]);
  const isStale = useMemo(() => {
    if (isSkip) return false;
    if (!convexIsPending) return false;
    if (cacheEntry.isPending) return false;
    return true;
  }, [isSkip, convexIsPending, cacheEntry.isPending]);
  // TODO: handle more fine grained loading (for pages) (e.g. convexQueryResult.status)
  //  => not needed as long as we only cache the first page (initialNumItems)
  const isPending = useMemo(() => {
    if (isSkip) return true;
    if (cacheEntry.isPending) return true;
    if (!cacheEntry.isPending && results.length === 0) return convexIsPending;
    return false;
  }, [isSkip, cacheEntry.isPending, convexIsPending, results]);

  return useMemo(
    () => ({
      ...convexQueryResult,
      results,
      isStale,
      isPending,
    }),
    [convexQueryResult, results, isPending, isStale]
  );
}
