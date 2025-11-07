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
import { useRef } from "react";
import { usePaginatedQueryBase, useQueryBase } from "./use-convex-query-0-base";

export function useQueryStable<Query extends FunctionReference<"query">>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const result = useQueryBase(query, ...queryArgs);
  const stored = useRef(result);

  if (result !== undefined) {
    stored.current = result;
  }
  return stored.current;
}

export function usePaginatedQueryStable<Query extends PaginatedQueryReference>(
  query: Query,
  args: PaginatedQueryArgs<Query> | "skip",
  options: {
    initialNumItems: number;
    // latestPageSize?: "grow" | "fixed";
  }
): UsePaginatedQueryReturnType<Query> {
  const res = usePaginatedQueryBase(query, args, options);

  const stored = useRef(res.results);

  if (res.status !== "LoadingFirstPage") {
    stored.current = res.results;
  }

  return {
    ...res,
    results: stored.current,
  };
}
