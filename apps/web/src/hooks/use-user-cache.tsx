import type { StandardSchemaV1 } from "@standard-schema/spec";
import { useEffect, useMemo } from "react";
import { idbKvAdapter } from "@/lib/cache/adapters/idbKV";
import { localCacheAdapter } from "@/lib/cache/adapters/localStorageAdapter";
import { multiLayerCache } from "@/lib/cache/adapters/multiLayerCache";
import { sizeLimitedAdapter } from "@/lib/cache/adapters/sizeLimitedAdapter";
import { Cache } from "@/lib/cache/LocalCache";
import { useAuth } from "./use-auth";

const lastLoggedInUserIdCache = {
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

  return cache;
}

export function useUserCacheEntry<T>(key: string, schema: StandardSchemaV1<T>) {
  const userCache = useUserCache();
  return userCache.entry(key, schema);
}
