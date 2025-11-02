import type { ICacheAdapter } from "../ICacheAdapter";

/**
 * Creates a multi-layer cache adapter that chains multiple adapters with fallback behavior.
 *
 * @usage
 * ```ts
 * const multiCache = multiLayerCache([localStorageAdapter, idbAdapter]);
 * const value = await multiCache.get("key"); // Tries localStorage first, then idb
 * await multiCache.set("key", value); // Sets in both layers
 * ```
 */
export function multiLayerCache<TKey extends string = string, TValue = unknown>(
  adapters: ICacheAdapter<TKey, TValue>[]
): ICacheAdapter<TKey, TValue> {
  if (adapters.length === 0) {
    throw new Error("multiLayerCache requires at least one adapter");
  }

  return {
    async get(key: TKey): Promise<TValue | undefined> {
      const missedLayers: ICacheAdapter<TKey, TValue>[] = [];
      for (const adapter of adapters) {
        const value = await adapter.get(key);
        if (value === undefined) {
          missedLayers.push(adapter);
          continue;
        }
        if (missedLayers.length > 0) {
          Promise.allSettled(
            missedLayers.map((a) => a.set(key, value))
          ).finally(() =>
            console.log("persisted to missed layers", missedLayers)
          );
        }
        return value;
      }
      return;
    },

    async set(key: TKey, value: TValue): Promise<void> {
      await Promise.allSettled(
        adapters.map((adapter) => adapter.set(key, value))
      );
    },

    async del(key: TKey): Promise<void> {
      await Promise.allSettled(adapters.map((adapter) => adapter.del(key)));
    },

    async clear(): Promise<void> {
      await Promise.allSettled(adapters.map((adapter) => adapter.clear())).then(
        (res) => console.log("cleared all layers", res)
      );
    },
  };
}
