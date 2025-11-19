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
import {
  type FunctionArgs,
  type FunctionReference,
  type FunctionReturnType,
  getFunctionName,
  type OptionalRestArgs,
} from "convex/server";
import { useEffect, useMemo } from "react";
import z from "zod";
import { asyncSession } from "@/hooks/use-auth";
import { convex } from "@/hooks/use-convex";
import { useUserCacheEntryOnce } from "@/hooks/use-user-cache";
import { skipCache } from "@/lib/cache/Cache";
import { UserCache } from "@/lib/cache/UserCache";
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
  const keyString = createCacheKey(query, queryArgs);
  const cacheEntry = useUserCacheEntryOnce<FunctionReturnType<Query>>(
    isSkip ? skipCache : keyString
  );

  // Query
  const convexQueryResult = useCvxQueryStable(query, ...queryArgs);
  const convexIsPending = convexQueryResult === undefined;

  // Cache persistence
  useEffect(() => {
    if (isSkip || convexIsPending) return;
    // we want to persist null (explicit no data) but never undefined (pending/skipped)
    if (convexQueryResult !== undefined) cacheEntry.set(convexQueryResult);
    // we do NOT want to delete cache. We should think of other mechanism to garbage collect it.
    // if (convexQueryResult === null) cacheEntry.del();
  }, [isSkip, convexIsPending, convexQueryResult, cacheEntry.set]);

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
      createCacheKey(query, {
        ...argsObject,
        paginationOpts: {
          numItems: options.initialNumItems,
          cursor: null,
        },
      }),
    [query, argsObject, options.initialNumItems]
  );
  const cacheEntry = useUserCacheEntryOnce<PaginatedQueryItem<Query>[]>(
    isSkip ? skipCache : keyString,
    z.array(z.any())
  );

  // Query
  const convexQueryResult = useCvxPaginatedQueryStable(query, args, options);
  const convexIsPending = convexQueryResult.status === "LoadingFirstPage";

  // Cache persistence
  useEffect(() => {
    if (isSkip || convexIsPending) return;
    // this only cache the first page (initialNumItems)
    // we want to persist empty arrays because it's explicit empty result
    if (convexQueryResult.results.length <= options.initialNumItems) {
      cacheEntry.set(convexQueryResult.results);
    }
    // we do NOT want to delete cache. We should think of other mechanism to garbage collect it.
    // if (convexQueryResult.results.length === 0) cacheEntry.del();
  }, [
    isSkip,
    convexIsPending,
    convexQueryResult,
    cacheEntry.set,
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

function createCacheKey<Query extends FunctionReference<"query">>(
  query: Query,
  queryArgs: FunctionArgs<Query>
) {
  return ["cvxQueryCached", createQueryKey(query, queryArgs)].join(":");
}

// TODO: check it works because haven't tested it yet
export function setQueryCache<Query extends FunctionReference<"query">>(
  data: FunctionReturnType<Query>,
  query: Query,
  ...queryArgs: OptionalRestArgs<Query>
): void {
  const keyString = createCacheKey(query, queryArgs);
  const userCache = UserCache.getInstance();
  const cacheEntry = userCache.entry<FunctionReturnType<Query>>(keyString);
  cacheEntry.set(data);
}

// TODO: check it works because haven't tested it yet
export function setPaginatedQueryCache<Query extends PaginatedQueryReference>(
  data: PaginatedQueryItem<Query>[],
  query: Query,
  ...argsAndOptions: [
    PaginatedQueryArgs<Query>,
    options: {
      initialNumItems: number;
      // latestPageSize?: "grow" | "fixed";
    },
  ]
): void {
  const [args, options] = argsAndOptions;
  const keyString = createCacheKey(query, {
    ...args,
    paginationOpts: {
      numItems: options.initialNumItems,
      cursor: null,
    },
  });
  const userCache = UserCache.getInstance();
  const cacheEntry = userCache.entry<PaginatedQueryItem<Query>[]>(keyString);
  cacheEntry.set(data);
}

/**
 * If query has stale data (local cache), skip
 * If missing local cache, fetch it and store it
 *
 * @note if you want to force preloading the cache, use preloadQuery instead
 *
 * @returns stale data from cache if any, or fresh data from convex if any
 */
export async function ensureQueryCached<
  Query extends FunctionReference<"query">,
>(
  query: Query,
  ...queryArgs: OptionalRestArgs<Query>
): Promise<FunctionReturnType<Query>> {
  const keyString = createCacheKey(query, queryArgs);
  try {
    // 1. check cache entry
    const userCache = UserCache.getInstance();
    const cacheEntry = userCache.entry<FunctionReturnType<Query>>(keyString);
    const value = await cacheEntry.get();
    if (value !== undefined) {
      // TODO: remove
      console.log("ensureQueryCached: skip, found in cache", {
        query: getFunctionName(query),
        queryArgs,
        value,
        scope: userCache.scope,
      });
      return value;
    }

    await asyncSession.wait();
    // 2. if not found, fetch it
    const convexQueryResult = await convex.query(query, ...queryArgs);
    // if (convexQueryResult === null) return;

    // 3. if found store it
    await cacheEntry.set(convexQueryResult);
    // TODO: remove
    console.log("ensureQueryCached: loaded from convex", {
      query: getFunctionName(query),
      queryArgs,
      convexQueryResult,
      scope: userCache.scope,
    });
    return convexQueryResult;
  } catch (error) {
    console.error(error);
    return;
  }
}

export async function ensurePaginatedQueryCached<
  Query extends PaginatedQueryReference,
>(
  query: Query,
  ...argsAndOptions: [
    PaginatedQueryArgs<Query>,
    options: {
      initialNumItems: number;
      // latestPageSize?: "grow" | "fixed";
    },
  ]
): Promise<PaginatedQueryItem<Query>[]> {
  const [args, options] = argsAndOptions;
  const keyString = createCacheKey(query, {
    ...args,
    paginationOpts: {
      numItems: options.initialNumItems,
      cursor: null,
    },
  });
  try {
    // 1. check cache entry
    const userCache = UserCache.getInstance();
    const cacheEntry = userCache.entry<PaginatedQueryItem<Query>[]>(keyString);
    const value = await cacheEntry.get();
    if (value !== undefined) {
      // TODO: remove
      console.log("ensurePaginatedQueryCached: skip, found in cache", {
        query: getFunctionName(query),
        args,
        value,
      });
      return value;
    }

    // 2. if not found, fetch it
    await asyncSession.wait();
    const convexQueryResult = await convex.query(
      query as PaginatedQueryReference,
      {
        ...args,
        paginationOpts: {
          numItems: options.initialNumItems,
          cursor: null,
        },
      }
    );
    // if (convexQueryResult.page.length === 0) return;

    // 3. if found store it
    await cacheEntry.set(convexQueryResult.page);
    // TODO: remove
    console.log("ensurePaginatedQueryCached: loaded from convex", {
      query: getFunctionName(query),
      args,
      convexQueryResult,
    });
    return convexQueryResult.page;
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Do fetch a convex query and store the result in the cache
 *
 * @returns fresh data from convex if any
 */
export async function preloadQuery<Query extends FunctionReference<"query">>(
  query: Query,
  ...queryArgs: OptionalRestArgs<Query>
): Promise<FunctionReturnType<Query>> {
  const keyString = createCacheKey(query, queryArgs);
  try {
    // 1. create cache entry
    const userCache = UserCache.getInstance();
    const cacheEntry = userCache.entry<FunctionReturnType<Query>>(keyString);

    // 2. fetch from convex
    const convexQueryResult = await convex.query(query, ...queryArgs);
    // if (convexQueryResult === null) return;

    // 3. if found store it
    await cacheEntry.set(convexQueryResult);
    // TODO: remove
    console.log("preloadQuery: preloaded", {
      query: getFunctionName(query),
      queryArgs,
      convexQueryResult,
    });
    return convexQueryResult;
  } catch (error) {
    console.error(error);
    return;
  }
}
