import type { ICacheAdapter } from "../ICacheAdapter";

export function cachePassthroughAdapter(): ICacheAdapter<string, unknown> {
  return {
    get(_key) {
      return Promise.resolve(undefined);
    },
    set(_key, _value) {
      return Promise.resolve();
    },
    del(_key) {
      return Promise.resolve();
    },
    clear() {
      return Promise.resolve();
    },
  };
}
