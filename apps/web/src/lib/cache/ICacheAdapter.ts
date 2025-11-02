import type { MaybePromise } from "../utils";

export interface ICacheAdapter<TKey extends string = string, TValue = unknown> {
  get: (key: TKey) => MaybePromise<TValue | undefined>;
  set: (key: TKey, value: TValue) => MaybePromise<void>;
  del: (key: TKey) => MaybePromise<void>;
  clear: () => MaybePromise<void>;
}
