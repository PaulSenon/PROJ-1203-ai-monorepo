import { useEffect, useRef } from "react";

/**
 * To get a non reactive snapshot from a state depending on a condition
 */
export function useStateSnapshotWhenReady<T>(
  value: T | undefined,
  ready: boolean
) {
  const ref = useRef<T | undefined>(undefined);

  // latch exactly once
  useEffect(() => {
    if (ready && ref.current === undefined && value !== undefined) {
      ref.current = value;
    }
  }, [ready, value]);

  return ref.current;
}
