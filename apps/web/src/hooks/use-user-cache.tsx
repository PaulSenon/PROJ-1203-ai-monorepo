import type { StandardSchemaV1 } from "@standard-schema/spec";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { idbAdapter } from "@/lib/cache/adapters/idbAdapter";
import { inMemoryEntryLimitedBufferAdapter } from "@/lib/cache/adapters/inMemoryEntryLimitedBufferAdapter";
import { localStorageAdapter } from "@/lib/cache/adapters/localStorageAdapter";
import { multiLayerCacheAdapter } from "@/lib/cache/adapters/multiLayerCacheAdapter";
import { Cache } from "@/lib/cache/Cache";
import { useAuth } from "./use-auth";
import { useEmergencySave } from "./utils/use-emergency-save";

export const lastLoggedInUserIdCache = {
  get: () => localStorage.getItem("lastLoggedInUserId"),
  set: (userId: string) => localStorage.setItem("lastLoggedInUserId", userId),
};

function createUserCache(cacheScope: string) {
  return new Cache(
    multiLayerCacheAdapter([
      inMemoryEntryLimitedBufferAdapter(localStorageAdapter, {
        maxKeys: 500,
        storageKey: cacheScope,
      }),
      idbAdapter(cacheScope),
      // cacheDebuggerAdapter,
    ])
  );
}

type CacheState = {
  cache: Cache<string>;
  scope: string;
};
const userCacheContext = createContext<CacheState | null>(null);

export function UserCacheProvider({ children }: { children: React.ReactNode }) {
  const { clerkUser, isLoadingClerk } = useAuth();
  const cacheScope = useMemo(
    () => clerkUser?.id ?? lastLoggedInUserIdCache.get() ?? "anonymous",
    [clerkUser]
  );

  const cache = useMemo(() => createUserCache(cacheScope), [cacheScope]);

  useEffect(() => {
    if (isLoadingClerk) return;
    if (clerkUser) {
      lastLoggedInUserIdCache.set(clerkUser.id);
    } else {
      lastLoggedInUserIdCache.set("anonymous");
      cache.clear();
    }
  }, [clerkUser, isLoadingClerk, cache]);

  const value = useMemo(
    () => ({ cache, scope: cacheScope }),
    [cache, cacheScope]
  );

  return (
    <userCacheContext.Provider value={value}>
      {children}
    </userCacheContext.Provider>
  );
}

export function useUserCache() {
  const context = useContext(userCacheContext);
  if (!context) {
    throw new Error("useUserCache must be used within a UserCacheProvider");
  }
  return context;
}

// TODO: move in helpers
function passThroughSchema<T>(): StandardSchemaV1<T> {
  return {
    "~standard": {
      validate: (value): StandardSchemaV1.SuccessResult<T> => ({
        value: value as T,
      }),
      vendor: "pass-through",
      version: 1,
    },
  };
}

export function useUserCacheEntryOnce<T>(
  key: string, // TODO: make it string[]
  schema?: StandardSchemaV1<T>
) {
  const schemaRef = useRef(schema);

  // null: loaded but null
  // undefined: not loaded yet
  const [snapshot, setSnapshot] = useState<T | null | undefined>(undefined);
  const { cache } = useUserCache();
  const entry = useMemo(
    () => cache.entry(key, schemaRef.current ?? passThroughSchema<T>()),
    [cache, key]
  );

  useEffect(() => {
    // reset loading state if cache changes
    setSnapshot(undefined);
    entry.get().then((value) => {
      // Important: must be null, never undefined
      // otherwise it will says "it's still loading"
      setSnapshot(value ?? null);
    });
  }, [entry]);

  return useMemo(
    () => ({
      ...entry,
      snapshot,
      isPending: snapshot === undefined,
    }),
    [entry, snapshot]
  );
}

export function useUserCacheEntry<T>(
  key: string, // TODO: make it string[]
  schema?: StandardSchemaV1<T>
) {
  const schemaRef = useRef(schema);
  const { cache, scope } = useUserCache();
  const entry = useMemo(
    () => cache.entry(key, schemaRef.current ?? passThroughSchema<T>()),
    [cache, key]
  );

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
      context.client.setQueryData(queryKey, null);
      return { prev };
    },
    onError: (error, _vars, onMutateResult, context) => {
      console.error(error);
      context.client.setQueryData(queryKey, onMutateResult?.prev);
    },
    onSuccess: (_saved, _vars, _onMutateResult, context) => {
      context.client.setQueryData(queryKey, null);
    },
  });

  useEmergencySave({
    key: queryKey.join(":"),
    data,
    restoreCallback: (restored) => restored && set.mutate(restored),
    isInEmergencyState: () => set.isPending,
  });

  return useMemo(
    () => ({
      isPending,
      data,
      set: set.mutateAsync,
      del: del.mutateAsync,
    }),
    [isPending, data, set, del]
  );
}
