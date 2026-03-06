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
  useCvxPaginatedQueryAuthCached,
  useCvxQueryAuthCached,
} from "./use-convex-query-0-auth";

function toStableKey(value: unknown) {
  return JSON.stringify(value);
}

export function useCvxQueryStable<Query extends FunctionReference<"query">>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const result = useCvxQueryAuthCached(query, ...queryArgs);
  const stored = useRef(result);
  const argsKeyRef = useRef(toStableKey(queryArgs));
  const nextArgsKey = toStableKey(queryArgs);

  if (argsKeyRef.current !== nextArgsKey) {
    argsKeyRef.current = nextArgsKey;
    stored.current = undefined;
  }

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
  const res = useCvxPaginatedQueryAuthCached(query, args, options);

  const stored = useRef(res.results);
  const argsKeyRef = useRef(toStableKey(args));
  const nextArgsKey = toStableKey(args);

  if (argsKeyRef.current !== nextArgsKey) {
    argsKeyRef.current = nextArgsKey;
    stored.current = [];
  }

  if (res.status !== "LoadingFirstPage") {
    stored.current = res.results;
  }

  const stableResults = stored.current;

  return useMemo(
    () =>
      ({
        isLoading: res.isLoading,
        loadMore: res.loadMore,
        results: stableResults,
        status: res.status,
        isPending: res.status === "LoadingFirstPage",
      }) as UsePaginatedQueryReturnType<Query> & { isPending: boolean },
    [res.isLoading, res.loadMore, res.status, stableResults]
  );
}
