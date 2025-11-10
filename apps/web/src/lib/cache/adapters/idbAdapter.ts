import { deleteDB, type IDBPDatabase, openDB } from "idb";
import type { ICacheAdapter } from "../ICacheAdapter";

/**
 * Simple scoped IndexedDB key-value store wrapper.
 * Each instance manages its own database with a single keyval store.
 */

export function idbAdapter(dbName: string): ICacheAdapter {
  return new IdbKv(dbName);
}
class IdbKv<TKey extends string = string, TValue = unknown>
  implements ICacheAdapter<TKey, TValue>
{
  private readonly dbName: string;
  private static readonly dbPromises = new Map<string, Promise<IDBPDatabase>>();
  private static readonly storeName = "kv";

  constructor(storeName: string) {
    this.dbName = storeName;
  }

  private getDB(): Promise<IDBPDatabase> {
    // Return cached promise if exists, otherwise create and cache
    let promise = IdbKv.dbPromises.get(this.dbName);
    if (!promise) {
      promise = openDB(this.dbName, 1, {
        upgrade(db) {
          db.createObjectStore(IdbKv.storeName);
        },
      });
      IdbKv.dbPromises.set(this.dbName, promise);
    }
    return promise;
  }

  async get(key: TKey): Promise<TValue | undefined> {
    const db = await this.getDB();
    return db.get(IdbKv.storeName, key);
  }

  async set(key: TKey, value: TValue): Promise<void> {
    const db = await this.getDB();
    await db.put(IdbKv.storeName, value, key);
  }

  async del(key: TKey): Promise<void> {
    const db = await this.getDB();
    await db.delete(IdbKv.storeName, key);
  }

  async clear(): Promise<void> {
    await deleteDB(this.dbName);
  }
}
