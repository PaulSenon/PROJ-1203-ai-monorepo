/** biome-ignore-all lint/suspicious/noTsIgnore: scheduler isn't typed */
type YieldOptions = {
  signal?: AbortSignal;
};

export function yieldNextTask(options?: YieldOptions): Promise<void> {
  const { signal } = options ?? {};

  if (!signal) {
    return new Promise((resolve, reject) => {
      // @ts-ignore scheduler not typed
      if (window.scheduler?.yield) {
        // @ts-ignore scheduler not typed
        window.scheduler.yield().then(resolve, reject);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const finish = () => {
      cleanup();
      resolve();
    };

    const fail = (reason: unknown) => {
      cleanup();
      reject(reason);
    };

    const onAbort = () => {
      fail(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    // @ts-ignore scheduler not typed
    if (window.scheduler?.yield) {
      // @ts-ignore scheduler not typed
      window.scheduler.yield().then(finish, fail);
    } else {
      timeoutId = setTimeout(finish, 0);
    }
  });
}

export function yieldNextPaint(options?: YieldOptions): Promise<void> {
  const { signal } = options ?? {};

  if (!signal) {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    let rafId: number | null = null;
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const finish = () => {
      cleanup();
      resolve();
    };

    const fail = (reason: unknown) => {
      cleanup();
      reject(reason);
    };

    const onAbort = () => {
      fail(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    rafId = requestAnimationFrame(() => finish());
  });
}
