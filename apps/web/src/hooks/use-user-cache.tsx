import type { StandardSchemaV1 } from "@standard-schema/spec";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { idbKvAdapter } from "@/lib/cache/adapters/idbKV";
import { localCacheAdapter } from "@/lib/cache/adapters/localStorageAdapter";
import { multiLayerCache } from "@/lib/cache/adapters/multiLayerCache";
import { sizeLimitedAdapter } from "@/lib/cache/adapters/sizeLimitedAdapter";
import { Cache } from "@/lib/cache/LocalCache";
import { useAuth } from "./use-auth";

export const lastLoggedInUserIdCache = {
  get: () => localStorage.getItem("lastLoggedInUserId"),
  set: (userId: string) => localStorage.setItem("lastLoggedInUserId", userId),
};

function createUserCache(cacheScope: string) {
  return new Cache(
    multiLayerCache([
      sizeLimitedAdapter(localCacheAdapter, {
        maxKeys: 1000,
        storageKey: cacheScope,
      }),
      idbKvAdapter(cacheScope),
    ])
  );
}

export function useUserCache() {
  const { clerkUser, isLoadingClerk } = useAuth();
  const cacheScope =
    clerkUser?.id ?? lastLoggedInUserIdCache.get() ?? "anonymous";

  const cache = useMemo(() => createUserCache(cacheScope), [cacheScope]);

  // persist for next time
  useEffect(() => {
    if (isLoadingClerk) return;
    if (clerkUser) {
      lastLoggedInUserIdCache.set(clerkUser.id);
    } else {
      lastLoggedInUserIdCache.set("anonymous");
      cache.clear();
    }
  }, [clerkUser, isLoadingClerk, cache]);

  return { cache, scope: cacheScope };
}

export function useUserCacheEntry<T>(key: string, schema: StandardSchemaV1<T>) {
  const { cache, scope } = useUserCache();
  const entry = useMemo(() => cache.entry(key, schema), [cache, key, schema]);

  const queryKey = ["user-cache-entry", scope, key];

  const { data, isPending } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await entry.get();
      return res ?? null;
    },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const set = useMutation({
    retry: false,
    mutationFn: async (input: T) => {
      await entry.set(input);
      return input;
    },
    onMutate: async (next, context) => {
      await context.client.cancelQueries({ queryKey });
      const prev = context.client.getQueryData<T>(queryKey);
      context.client.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (error, _vars, onMutateResult, context) => {
      console.error(error);
      context.client.setQueryData(queryKey, onMutateResult?.prev);
    },
    onSuccess: (saved, _vars, _onMutateResult, context) => {
      context.client.setQueryData(queryKey, saved);
    },
  });

  const del = useMutation({
    retry: false,
    mutationFn: async () => {
      await entry.del();
    },
    onMutate: async (_next, context) => {
      await context.client.cancelQueries({ queryKey });
      const prev = context.client.getQueryData<T>(queryKey);
      context.client.setQueryData(queryKey, undefined);
      return { prev };
    },
    onError: (error, _vars, onMutateResult, context) => {
      console.error(error);
      context.client.setQueryData(queryKey, onMutateResult?.prev);
    },
    onSuccess: (_saved, _vars, _onMutateResult, context) => {
      context.client.setQueryData(queryKey, undefined);
    },
  });

  return {
    isPending,
    data,
    set: set.mutate,
    del: del.mutate,
  };
}
