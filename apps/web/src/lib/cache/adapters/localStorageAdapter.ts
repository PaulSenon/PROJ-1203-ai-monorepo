import type { ICacheAdapter } from "../ICacheAdapter";

export const localCacheAdapter: ICacheAdapter = {
  get: async (key) => {
    const item = localStorage.getItem(key);
    if (item === null) return;
    try {
      return JSON.parse(item);
    } catch {
      return;
    }
  },
  set: async (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  del: async (key) => localStorage.removeItem(key),
  clear: async () => localStorage.clear(),
};
