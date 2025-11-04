import { useCallback, useEffect, useRef } from "react";

type DebounceOptions = { delay: number };

/**
 * Debounced function with flush-on-cleanup.
 * Returns stable wrapper that schedules calls and flushes on unmount.
 */
// biome-ignore lint/suspicious/noExplicitAny: I know what I'm doing
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  options: DebounceOptions
): [T, () => ReturnType<T>] {
  const { delay } = options;

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
      cancelTimeout();

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        invokePending();
      }, delay);
    },
    [callback, delay, cancelTimeout, invokePending, ...deps]
  ) as T;

  const flush = useCallback(() => invokePending(), [invokePending]);

  // flush on unmount
  useEffect(() => flush, [flush]);

  return [debounced, flush] as const;
}
