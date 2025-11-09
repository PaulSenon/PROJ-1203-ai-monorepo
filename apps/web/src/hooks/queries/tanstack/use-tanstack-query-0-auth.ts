import {
  type QueryKey,
  skipToken,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export function useTsQueryAuth<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey & readonly string[] = readonly string[],
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<NoInfer<TData>, TError> {
  const { isFullyReady } = useAuth();

  return useQuery({
    ...options,
    queryFn: isFullyReady ? options.queryFn : skipToken,
  });
}
