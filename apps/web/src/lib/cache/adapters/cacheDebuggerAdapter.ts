import type { ICacheAdapter } from "../ICacheAdapter";

export const cacheDebuggerAdapter: ICacheAdapter<string, unknown> = {
  get(key) {
    console.log("CACHE DEBUGGER: get", key);
    return Promise.resolve(undefined);
  },
  set(key, value) {
    console.log("CACHE DEBUGGER: set", key, value);
    return Promise.resolve();
  },
  del(key) {
    console.log("CACHE DEBUGGER: del", key);
    return Promise.resolve();
  },
  clear() {
    console.log("CACHE DEBUGGER: clear");
    return Promise.resolve();
  },
};
