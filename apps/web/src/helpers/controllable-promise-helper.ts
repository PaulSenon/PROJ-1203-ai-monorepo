/**
 * AI GENERATE
 * TODO: doublecheck
 */

// Multi-shot, sticky, resettable. Promise-like surface.
export function createControllablePromise<T>() {
  type Resolve = (v: T) => void;

  let state: "pending" | "resolved" = "pending";
  let resolvePending: Resolve | undefined;
  let value: T | undefined;

  let current: Promise<T> = new Promise<T>((res) => {
    resolvePending = res;
  });

  const toResolved = (v: T) => {
    value = v;
    state = "resolved";
    // replace by an already-resolved promise so future .then() resolves instantly
    current = Promise.resolve(v);
    resolvePending = undefined;
  };

  return {
    // core API
    wait: () => current,
    resolve(v: T) {
      if (state === "pending" && resolvePending) {
        resolvePending(v); // wake all current awaiters
      }
      toResolved(v); // make it sticky for late awaiters
    },
    suspend() {
      if (state === "pending") return;
      state = "pending";
      value = undefined;
      current = new Promise<T>((res) => {
        resolvePending = res;
      });
    },

    // sync helpers
    ready: () => state === "resolved",
    get: () => value, // T | undefined

    // thenable facade
    // biome-ignore lint/suspicious/noThenProperty: tkt
    then<U, V = never>(
      // biome-ignore lint/nursery/noShadow: tkt
      onFulfilled?: ((value: T) => U | PromiseLike<U>) | null,
      onRejected?: ((reason: unknown) => V | PromiseLike<V>) | null
    ) {
      return current.then(onFulfilled ?? undefined, onRejected ?? undefined);
    },
    catch<U>(onRejected: (reason: unknown) => U | PromiseLike<U>) {
      return current.catch(onRejected);
    },
    finally(onFinally?: (() => void) | null) {
      return current.finally(onFinally ?? undefined);
    },
    [Symbol.toStringTag]: "ControllablePromise",
  };
}
