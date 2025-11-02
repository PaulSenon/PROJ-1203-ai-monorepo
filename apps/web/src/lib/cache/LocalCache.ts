import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Prettify } from "../utils";
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
 * @example
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
export class Cache<TKeyBase extends string, TValueBase> {
  private readonly cacheAdapter: ICacheAdapter<TKeyBase, TValueBase>;

  constructor(adapter: ICacheAdapter<TKeyBase, TValueBase>) {
    this.cacheAdapter = adapter;
  }

  entry<TKey extends TKeyBase, TValue extends TValueBase>(
    key: TKey,
    schema: StandardSchemaV1<TValue>
  ): Prettify<ValidatedCacheEntry<TKey, TValue>> {
    return new ValidatedCacheEntry({
      adapter: this.cacheAdapter as ICacheAdapter<string, unknown>,
      schema,
      key,
    });
  }

  clear() {
    return this.cacheAdapter.clear();
  }
}

class ValidatedCacheEntry<TKey extends string, TValue> {
  private readonly cacheAdapter: ICacheAdapter;
  private readonly schema: StandardSchemaV1<TValue>;
  private readonly key: TKey;

  constructor({
    adapter,
    schema,
    key,
  }: {
    adapter: ICacheAdapter;
    schema: StandardSchemaV1<TValue>;
    key: TKey;
  }) {
    this.cacheAdapter = adapter;
    this.schema = schema;
    this.key = key;
  }

  del = async () => {
    await this.cacheAdapter.del(this.key);
  };

  get = async () => {
    const value = await this.cacheAdapter.get(this.key);
    if (!value) return;
    const result = await this.schema["~standard"].validate(value);
    if (result.issues) {
      await this.del();
      return;
    }
    return result.value;
  };

  set = async (value: TValue) => {
    const validatedValue = await this.schema["~standard"].validate(value);
    if (validatedValue.issues) {
      throw new Error("Invalid value", { cause: validatedValue.issues });
    }
    await this.cacheAdapter.set(this.key, validatedValue.value);
  };
}
