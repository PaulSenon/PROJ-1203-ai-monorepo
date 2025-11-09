import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { useTsQueryCached } from "./use-tanstack-query-1-cached";

export function useTsQueryInitialValue<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey & readonly string[] = readonly string[],
>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const prevKeyRef = useRef<QueryKey | null>(null);
  const query = useTsQueryCached({
    // new defaults
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    // pass through options
    ...options,
    // force specific reactivity
    // notifyOnChangeProps: ["data", "isFetching"], // Watch both to know when data is ready
  });

  const initialValue = useMemo(() => {
    const prevKey = prevKeyRef.current?.join(":");
    const currentKey = options.queryKey.join(":");
    if (prevKey === currentKey) {
      return query.data;
    }
    prevKeyRef.current = options.queryKey;
    return query.isFetching ? undefined : query.data;
  }, [options.queryKey, query.isFetching, query.data]);

  return useMemo(
    () => ({
      data: initialValue,
      isPending: initialValue === undefined || query.isFetching,
    }),
    [initialValue, query.isFetching]
  );
}
