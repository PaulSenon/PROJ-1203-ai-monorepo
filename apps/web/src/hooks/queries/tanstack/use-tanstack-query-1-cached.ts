import type {
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useUserCacheEntryOnce } from "@/hooks/use-user-cache";
import { useTsQueryAuth } from "./use-tanstack-query-0-auth";

export function useTsQueryCached<
  TQueryFnData = unknown,
  TError = Error,
  TQueryKey extends QueryKey & readonly string[] = readonly string[],
>(
  options: Omit<
    UseQueryOptions<TQueryFnData, TError, TQueryFnData, TQueryKey>,
    "select"
  >
): UseQueryResult<NoInfer<TQueryFnData>, TError> {
  const keyString = useMemo(
    () => ["tsQueryCached", ...options.queryKey].join(":"),
    [options.queryKey]
  );
  const cached = useUserCacheEntryOnce<TQueryFnData>(keyString);

  const query = useTsQueryAuth({
    ...options,
    initialData: cached.snapshot ?? undefined,
    enabled: !cached.isPending,
  });

  // Cache persistence
  useEffect(() => {
    if (query.isPending) return;
    if (query.data) cached.set(query.data);
    else cached.del();
  }, [query.isPending, query.data, cached.set, cached.del]);

  const isStale = useMemo(() => {
    if (query.data !== undefined) return false;
    if (cached.isPending) return false;
    return true;
  }, [query.data, cached.isPending]);

  return useMemo(
    () => ({
      ...query,
      isStale,
    }),
    [query, isStale]
  );
}
