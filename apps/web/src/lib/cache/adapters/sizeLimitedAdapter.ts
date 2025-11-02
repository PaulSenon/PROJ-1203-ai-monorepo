import type { ICacheAdapter } from "../ICacheAdapter";

interface CacheEntry<TValue> {
  value: TValue;
  timestamp: number;
}

interface StorageData<TValue> {
  entries: Record<string, CacheEntry<TValue>>;
  keyOrder: string[];
}

/**
 * Creates a size-limited adapter wrapper that manages storage quota for localStorage.
 * Uses a single localStorage key with in-memory Map for efficient access.
 * Persists changes asynchronously via requestAnimationFrame.
 *
 * @usage
 * ```ts
 * const limitedAdapter = sizeLimitedAdapter(localCacheAdapter, {
 *   maxKeys: 1000,
 *   storageKey: "cache-data"
 * });
 * ```
 */
export function sizeLimitedAdapter<
  TKey extends string = string,
  TValue = unknown,
>(
  adapter: ICacheAdapter<TKey, TValue>,
  options: {
    maxKeys?: number;
    maxSizeBytes?: number;
    storageKey?: string;
  } = {}
): ICacheAdapter<TKey, TValue> {
  const maxKeys = options.maxKeys ?? 1000;
  const maxSizeBytes = options.maxSizeBytes;
  const storageKey = options.storageKey ?? "cache-data";

  // In-memory Map: key -> CacheEntry
  const memoryCache = new Map<TKey, CacheEntry<TValue>>();
  // Track insertion order for FIFO eviction
  const keyOrder: TKey[] = [];
  let isInitialized = false;
  let pendingPersist = false;

  /**
   * Load all data from localStorage into memory on first access
   */
  async function loadFromStorage(): Promise<void> {
    if (isInitialized) return;

    try {
      const stored = await adapter.get(storageKey as TKey);
      if (stored) {
        const data = stored as unknown as StorageData<TValue>;
        if (data.entries && data.keyOrder) {
          for (const key of data.keyOrder) {
            const entry = data.entries[key];
            if (entry) {
              memoryCache.set(key as TKey, entry);
              keyOrder.push(key as TKey);
            }
          }
        }
      }
    } catch {
      // If load fails, start with empty cache
    }

    isInitialized = true;
  }

  /**
   * Persist in-memory data to localStorage asynchronously
   */
  function persistToStorage(): void {
    if (pendingPersist) return;
    pendingPersist = true;

    requestAnimationFrame(async () => {
      try {
        const data: StorageData<TValue> = {
          entries: {},
          keyOrder: [],
        };

        for (const key of keyOrder) {
          const entry = memoryCache.get(key);
          if (entry) {
            data.entries[key] = entry;
            data.keyOrder.push(key);
          }
        }

        await adapter.set(storageKey as TKey, data as unknown as TValue);
      } catch (error) {
        // Handle QuotaExceededError by evicting and retrying
        if (
          error instanceof Error &&
          (error.name === "QuotaExceededError" ||
            error.message.includes("QuotaExceededError"))
        ) {
          // Evict oldest entries until we can persist
          while (keyOrder.length > 0) {
            const oldestKey = keyOrder.shift();
            if (oldestKey) {
              memoryCache.delete(oldestKey);
            }
            try {
              const data: StorageData<TValue> = {
                entries: {},
                keyOrder: [],
              };
              for (const key of keyOrder) {
                const entry = memoryCache.get(key);
                if (entry) {
                  data.entries[key] = entry;
                  data.keyOrder.push(key);
                }
              }
              await adapter.set(storageKey as TKey, data as unknown as TValue);
              break;
            } catch {
              // Continue evicting
            }
          }
        }
      } finally {
        pendingPersist = false;
      }
    });
  }

  /**
   * Estimate current storage size in bytes
   */
  function estimateSize(): number {
    let size = 0;
    for (const [key, entry] of memoryCache.entries()) {
      size += key.length * 2; // UTF-16 encoding
      size += JSON.stringify(entry.value).length * 2;
      size += 8; // timestamp (number)
    }
    return size;
  }

  /**
   * Check storage quota using navigator.storage.estimate() if available
   */
  async function getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
  } | null> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage ?? 0,
          quota: estimate.quota ?? 0,
        };
      } catch {
        // API not available or failed
      }
    }
    return null;
  }

  /**
   * Evict oldest entries if over limits
   */
  async function evictIfNeeded(): Promise<void> {
    // Check key count limit
    if (keyOrder.length >= maxKeys) {
      const oldestKey = keyOrder.shift();
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }

    // Check size limit
    if (maxSizeBytes) {
      let currentSize = estimateSize();
      while (currentSize > maxSizeBytes && keyOrder.length > 0) {
        const oldestKey = keyOrder.shift();
        if (oldestKey) {
          memoryCache.delete(oldestKey);
          currentSize = estimateSize();
        }
      }
    }

    // Check browser quota (proactive check)
    const estimate = await getStorageEstimate();
    if (estimate) {
      const currentSize = estimateSize();
      // If we're using more than 80% of quota, evict some entries
      const threshold = estimate.quota * 0.8;
      if (estimate.usage + currentSize > threshold) {
        // Evict until we're below 70%
        const target = estimate.quota * 0.7;
        while (
          keyOrder.length > 0 &&
          estimate.usage + estimateSize() > target
        ) {
          const oldestKey = keyOrder.shift();
          if (oldestKey) {
            memoryCache.delete(oldestKey);
          }
        }
      }
    }
  }

  return {
    async get(key: TKey): Promise<TValue | undefined> {
      await loadFromStorage();
      const entry = memoryCache.get(key);
      if (entry) {
        // Update access timestamp for potential LRU (currently using FIFO)
        entry.timestamp = Date.now();
        return entry.value;
      }
      return;
    },

    async set(key: TKey, value: TValue): Promise<void> {
      await loadFromStorage();

      // Evict if needed before adding
      await evictIfNeeded();

      // Remove key from order if it exists (will be re-added at end)
      const existingIndex = keyOrder.indexOf(key);
      if (existingIndex !== -1) {
        keyOrder.splice(existingIndex, 1);
      }

      // Add/update entry
      memoryCache.set(key, {
        value,
        timestamp: Date.now(),
      });
      keyOrder.push(key);

      // Schedule async persistence
      persistToStorage();
    },

    async del(key: TKey): Promise<void> {
      await loadFromStorage();

      memoryCache.delete(key);
      const index = keyOrder.indexOf(key);
      if (index !== -1) {
        keyOrder.splice(index, 1);
      }

      // Schedule async persistence
      persistToStorage();
    },

    async clear(): Promise<void> {
      memoryCache.clear();
      keyOrder.length = 0;

      adapter.del(storageKey as TKey);
    },
  };
}
