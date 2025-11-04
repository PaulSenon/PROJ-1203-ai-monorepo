import { useCallback, useEffect, useRef } from "react";

type DebounceOptions = {
  delay: number;
  /**
   * If true, the callback will be invoked immediately if there is no pending call.
   * Then next call will be debounced has intended.
   * If false, the callback will be invoked after the delay has passed.
   * Default is false. (normal debouncing)
   */
  immediate?: boolean;
};

/**
 * Debounced function with flush-on-cleanup.
 * Returns stable wrapper that schedules calls and flushes on unmount and page unload.
 */
// biome-ignore lint/suspicious/noExplicitAny: I know what I'm doing
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  options: DebounceOptions
): { debounced: T; commit: () => ReturnType<T>; cancel: () => void } {
  const { delay, immediate = false } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCallRef = useRef<{ fn: T; args: Parameters<T> } | null>(null);

  const cancelTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const invokePending = useCallback(() => {
    const pending = pendingCallRef.current;
    if (!pending) return;

    cancelTimeout();
    pendingCallRef.current = null;
    return pending.fn(...pending.args);
  }, [cancelTimeout]);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      pendingCallRef.current = { fn: callback, args };
      const isIdle = timeoutRef.current === null;

      if (immediate && isIdle) {
        invokePending();
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
        }, delay);
      } else {
        cancelTimeout();
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          invokePending();
        }, delay);
      }
    },
    [callback, delay, immediate, cancelTimeout, invokePending, ...deps]
  ) as T;

  const flush = useCallback(() => invokePending(), [invokePending]);

  // flush on unmount
  useEffect(() => flush, [flush]);

  return { debounced, commit: flush, cancel: cancelTimeout };
}
