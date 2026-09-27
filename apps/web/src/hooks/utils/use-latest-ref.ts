import { useRef } from "react";

/**
 * Same as useRef but reassign on each exec.
 *
 * e.g.
 * useRef(value) // only set value on first ref init time
 * useLatestRef(value) // return a ref value that is always updated to value
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
