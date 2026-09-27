import { useEffect, useRef } from "react";

/**
 * Observe a value for changes. It won't trigger anything first, but any followup change
 * of value will trigger the effect callback.
 *
 * See this as a useEffect on a single value that skip initial call.
 *
 * It's using Object.is() so your value must be referentially stable.
 * Will treat null value as unset (no trigger when transitioning from null to anything else)
 *
 * @param cb same as effect callback, but you get access to pev, next values
 * @param value the stable ref value to observe.
 */
export function useValueChangeEffect<T>(
  // biome-ignore lint/suspicious/noConfusingVoidType: necessary here
  cb: (args: { prev: T; next: T }) => void | (() => void),
  value: T
) {
  const previousValueRef = useRef<T>(null);
  const cbRef = useRef(cb);

  cbRef.current = cb;

  useEffect(() => {
    if (previousValueRef.current === null) {
      previousValueRef.current = value;
      return;
    }

    const prev = previousValueRef.current;
    if (Object.is(prev, value)) return;

    previousValueRef.current = value;
    return cbRef.current({ prev, next: value });
  }, [value]);
}
