import type { OptimisticUpdate } from "convex/browser";
import { type ReactMutation, useMutation } from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import { useEffect, useMemo } from "react";
import { createControllablePromise } from "@/helpers/controllable-promise-helper";
import { useAuth } from "@/hooks/use-auth";

/**
 * This extends convex useMutation hooks, simply awaiting auth to be ready before firing.
 * So you can run mutations as anytime without worrying about auth.
 */

const authBlocker = createControllablePromise<void>();

export function createMutationWithAuth<T extends FunctionReference<"mutation">>(
  rawMutation: ReactMutation<T>
): ReactMutation<T> {
  async function mutation(
    ...args: OptionalRestArgs<T>
  ): Promise<FunctionReturnType<T>> {
    await authBlocker.wait();
    return rawMutation(...args);
  }
  mutation.withOptimisticUpdate = function withOptimisticUpdate(
    optimisticUpdate: OptimisticUpdate<FunctionArgs<T>>
  ): ReactMutation<T> {
    return createMutationWithAuth(
      rawMutation.withOptimisticUpdate(optimisticUpdate)
    );
  };
  return mutation;
}

export function useCvxMutationAuth<T extends FunctionReference<"mutation">>(
  mutation: T
): ReactMutation<T> {
  const { isFullyReady } = useAuth();
  const rawMutation = useMutation(mutation);

  useEffect(() => {
    if (isFullyReady) authBlocker.resolve();
    else authBlocker.suspend();
  }, [isFullyReady]);

  return useMemo(() => createMutationWithAuth(rawMutation), [rawMutation]);
}
