import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { is5xx, isNetworkError } from "@/helpers/network-status.helper";

// only retry on 5xx and network errors up to 3 time
const MAX_QUERY_RETRY = 3;
const queryRetry = (failureCount: number, error: unknown) => {
  if (is5xx(error) || isNetworkError(error))
    return failureCount < MAX_QUERY_RETRY;
  return false;
};

// only retry on 5xx and network errors up to 2 time
const MAX_MUTATION_RETRY = 2;
const mutationRetry = (failureCount: number, error: unknown) => {
  if (is5xx(error) || isNetworkError(error))
    return failureCount < MAX_MUTATION_RETRY;
  return false;
};

/**
 * Configure tanstack-query client
 */
export const tanstackQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: queryRetry,
    },
    mutations: {
      retry: mutationRetry,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: () => {
            tanstackQueryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});
