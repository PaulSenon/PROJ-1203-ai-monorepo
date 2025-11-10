import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ICacheAdapter } from "./ICacheAdapter";

/**
 * TODO: could be nice to build something like oRPC:
 *   const cache = cacheBuilder
 *      .adapter(indexedDbAdapter) // if serialized it's abstracted by adapter implementation
 *      .withTtl(1000) // default ttl, also add option params to entry factory
 *      .withRootKey("my-cache") // scoped cache, to avoid key collisions
 *      .build();
 *
 *  const entry = cache.entry("my-key", z.string(), { ttl: 1000 });
 *  await entry.set("my-value");
 *  const value = await entry.get();
 *  console.log(value);
 */

/**
 * @usage
 *  const localCacheAdapter: ICacheAdapter = {
 *     get: async (key) => localStorage.getItem(key as string),
 *     set: async (key, value) =>
 *       localStorage.setItem(key as string, value as string),
 *     del: async (key) => localStorage.removeItem(key as string),
 *     clear: async () => localStorage.clear(),
 *   };
 *
 *   async function main() {
 *     const idbKvAdapter = new IdbKv("my-cache");
 *     const cache = new Cache(idbKvAdapter);
 *     const entry1 = cache.entry("toto", z.url());
 *     await entry1.set("https://www.google.com");
 *     const value = await entry1.get();
 *     await cache.clear();
 *     console.log(value);
 *   }
 */

type CacheEntry<TValue> = {
  get: () => Promise<TValue | undefined>;
  set: (value: TValue) => Promise<void>;
  del: () => Promise<void>;
};

export class Cache<TKeyBase extends string> {
  private readonly cacheAdapter: ICacheAdapter<TKeyBase>;

  constructor(adapter: ICacheAdapter<TKeyBase>) {
    this.cacheAdapter = adapter;
  }

  entry<TKey extends TKeyBase, TValue>(
    key: TKey,
    schema: StandardSchemaV1<TValue>
  ): CacheEntry<TValue> {
    return {
      get: async () => {
        const value = await this.cacheAdapter.get(key);
        if (!value) return;
        const result = await schema["~standard"].validate(value);
        if (result.issues) {
          console.warn(
            `cache get: Value found but ignored because not matching schema: key:${key}`
          );
          await this.cacheAdapter.del(key);
          return;
        }
        return result.value;
      },
      set: async (value: TValue) => {
        const validatedValue = await schema["~standard"].validate(value);
        if (validatedValue.issues) {
          throw new Error(`cache set: Value not matching schema: key:${key}`, {
            cause: `received:\n${JSON.stringify(value, null, 2)}\nissues:\n${validatedValue.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n ")}`,
          });
        }
        await this.cacheAdapter.set(key, validatedValue.value);
      },
      del: async () => {
        await this.cacheAdapter.del(key);
      },
    };
  }

  clear() {
    return this.cacheAdapter.clear();
  }
}
