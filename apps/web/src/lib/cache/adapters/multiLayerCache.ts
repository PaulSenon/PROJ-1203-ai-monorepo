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
      // let i = 0;
      for (const adapter of adapters) {
        const value = await adapter.get(key);
        // console.log(`getting from layer ${i}`, {
        //   key,
        //   value,
        // });
        // i++;

        if (value === undefined) {
          missedLayers.push(adapter);
          continue;
        }

        // only persist to missed layers if not all layers have been tried
        // it means we found a value in a deeper layer so we can persist to the shallower layers
        // otherwise it means it's missing from all layers so no need to persist
        if (missedLayers.length > 0 && missedLayers.length < adapters.length) {
          Promise.allSettled(
            missedLayers.map((a) => a.set(key, value))
          ).finally(() =>
            console.log("persisted to missed layers", {
              key,
              value,
              missedLayersCount: missedLayers.length,
              adaptersCount: adapters.length,
            })
          );
        }

        // return first found value without waiting for persistence to all layers
        // (no await, they will be persisted in the background)
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
