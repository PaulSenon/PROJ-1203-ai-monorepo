import z, { type ZodType } from "zod";
import type { ICacheAdapter } from "../ICacheAdapter";

type Snapshot<TKey extends string, TValue> = {
  entries: Record<TKey, TValue>;
  keyOrder: TKey[];
};

const SnapshotSchema = z.object({
  entries: z.record(z.string(), z.unknown()),
  keyOrder: z.array(z.string()),
}) satisfies ZodType<Snapshot<string, unknown>>;

/**
 * Creates an in-memory persisted buffer adapter that wraps any cache adapter.
 * Uses a single metadata key to store a snapshot of all entries with FIFO eviction.
 * All operations work on in-memory Map, with debounced background persistence.
 *
 * @usage
 * ```ts
 * const bufferAdapter = sizeLimitedAdapter(localCacheAdapter, {
 *   maxKeys: 1000,
 *   storageKey: "cache-buffer"
 * });
 * ```
 */
export function sizeLimitedAdapter<
  TKey extends string = string,
  TValue = unknown,
>(
  adapter: ICacheAdapter<string, unknown>,
  options: {
    maxKeys?: number;
    storageKey?: string;
  } = {}
): ICacheAdapter<TKey, TValue> {
  const maxKeys = options.maxKeys ?? 1000;
  const storageKey = `cache-buffer:${options.storageKey}`;

  // In-memory Map: key -> value
  let memoryCache: Map<TKey, TValue> = new Map();
  // Track insertion order for FIFO eviction
  let keyOrder: TKey[] = [];
  let persistTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Load full snapshot from storage on first access
   */
  const init = async (): Promise<void> => {
    try {
      const stored = await adapter.get(storageKey as TKey);
      const snapshot = (await SnapshotSchema.parseAsync(stored)) as Snapshot<
        TKey,
        TValue
      >;
      memoryCache = new Map(
        Object.entries(snapshot.entries) as [TKey, TValue][]
      );
      keyOrder = snapshot.keyOrder;
    } catch (error) {
      console.warn("failed to load from storage", error);
      // If load fails, start with empty cache
    }

    console.log("loaded from storage", {
      storageKey,
      memoryCache: Object.fromEntries(memoryCache.entries()),
      keyOrder,
    });
  };
  const initPromise = init();

  /**
   * Persist full snapshot to storage with debounce
   */
  const schedulePersistence = (): void => {
    if (persistTimeout) {
      clearTimeout(persistTimeout);
    }

    persistTimeout = setTimeout(async () => {
      try {
        const snapshot: Snapshot<TKey, TValue> = {
          entries: Object.fromEntries(memoryCache.entries()) as Record<
            TKey,
            TValue
          >,
          keyOrder: [...keyOrder],
        };

        await adapter.set(storageKey, snapshot);
      } catch (error) {
        // Silently ignore persistence errors
        console.warn("failed to persist to storage", error);
      } finally {
        persistTimeout = null;
      }
    }, 100);
  };

  return {
    get: async (key: TKey): Promise<TValue | undefined> => {
      await initPromise;
      return memoryCache.get(key);
    },

    set: async (key: TKey, value: TValue): Promise<void> => {
      await initPromise;

      // Remove key from order if it exists (will be re-added at end)
      const existingIndex = keyOrder.indexOf(key);
      if (existingIndex !== -1) {
        keyOrder.splice(existingIndex, 1);
      }

      // Evict oldest if at limit
      if (keyOrder.length >= maxKeys) {
        const oldestKey = keyOrder.shift();
        if (oldestKey) {
          memoryCache.delete(oldestKey);
        }
      }

      // Add/update entry
      memoryCache.set(key, value);
      keyOrder.push(key);

      // Schedule debounced persistence
      schedulePersistence();
    },

    del: async (key: TKey): Promise<void> => {
      await initPromise;

      memoryCache.delete(key);
      const index = keyOrder.indexOf(key);
      if (index !== -1) {
        keyOrder.splice(index, 1);
      }

      // Schedule debounced persistence
      schedulePersistence();
    },

    clear: async (): Promise<void> => {
      memoryCache.clear();
      keyOrder.length = 0;

      if (persistTimeout) {
        clearTimeout(persistTimeout);
        persistTimeout = null;
      }

      await adapter.del(storageKey as TKey);
    },
  };
}
