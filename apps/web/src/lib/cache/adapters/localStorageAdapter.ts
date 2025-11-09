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
  set: async (key, value) => {
    const serializedValue = JSON.stringify(value);
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => localStorage.setItem(key, serializedValue), {
        timeout: 0,
      });
    } else {
      setTimeout(() => localStorage.setItem(key, serializedValue), 0);
    }
  },
  del: async (key) => localStorage.removeItem(key),
  clear: async () => localStorage.clear(),
};
