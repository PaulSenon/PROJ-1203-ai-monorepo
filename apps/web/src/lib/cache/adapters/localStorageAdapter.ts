import { deferSyncTask } from "@/helpers/defer-sync-task";
import type { ICacheAdapter } from "../ICacheAdapter";

export const localStorageAdapter: ICacheAdapter = {
  get: async (key) => {
    const item = localStorage.getItem(key);
    if (item === null) return;
    try {
      return JSON.parse(item);
    } catch {
      return;
    }
  },
  set: async (key, value) => {
    const serializedValue = JSON.stringify(value);
    await deferSyncTask(() => localStorage.setItem(key, serializedValue));
  },
  del: async (key) => deferSyncTask(() => localStorage.removeItem(key)),
  clear: async () => deferSyncTask(() => localStorage.clear()),
};
