import { cacheDebugLoggerAdapter } from "./adapters/cacheDebugLoggerAdapter";
import { idbAdapter } from "./adapters/idbAdapter";
import { inMemoryEntryLimitedBufferAdapter } from "./adapters/inMemoryEntryLimitedBufferAdapter";
import { localStorageAdapter } from "./adapters/localStorageAdapter";
import { multiLayerCacheAdapter } from "./adapters/multiLayerCacheAdapter";
import { Cache } from "./Cache";
import type { ICacheAdapter } from "./ICacheAdapter";

/**
 * Cache implementation adding
 * - scope to avoid different users' keys collisions
 * - singleton pattern to avoid multiple instances
 * - multilayer cache with
 *    1. small in-memory buffer loaded from localStorage
 *    2. persistent to IndexedDB
 *
 * @usage
 * ```ts
 * // somewhere at init/when user changes
 * UserCache.newInstance("user-123");
 *
 * // use cache
 * const userCache = UserCache.getInstance();
 * const entry = userCache.entry("my-key", z.string());
 * await entry.set("my-value");
 * const value = await entry.get();
 * console.log(value);
 * ```
 */
export class UserCache extends Cache<string> {
  private static instance: UserCache;
  readonly scope: string;
  private constructor(adapter: ICacheAdapter<string>, scope: string) {
    super(adapter);
    this.scope = scope;
  }

  static getInstance() {
    if (!UserCache.instance) {
      throw new Error("UserCache not initialized");
    }
    return UserCache.instance;
  }

  static newInstance(cacheScope: string) {
    console.log("UserCache.newInstance for scope:", cacheScope);
    if (UserCache.instance) {
      console.log("UserCache.newInstance: clearing existing instance");
      UserCache.instance.clear();
    }
    UserCache.instance = new UserCache(
      cacheDebugLoggerAdapter(
        multiLayerCacheAdapter([
          inMemoryEntryLimitedBufferAdapter(localStorageAdapter, {
            maxKeys: 500,
            storageKey: cacheScope,
            // because limited entries, skip empty values to save space
            // we will fallback on idb anyway.
            skipNullishValues: true,
          }),
          idbAdapter(cacheScope),
        ]),
        {
          enabled: true,
          logToConsole: false,
          includeValue: true,
        }
      ),
      cacheScope
    );
    return UserCache.instance;
  }
}
