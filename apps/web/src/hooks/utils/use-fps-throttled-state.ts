/**
 * Partially AI generated code (Gemini 3 Pro)
 *
 * @example
 * ```tsx
 * const tooReactive = useThirdPartyHook();
 * const throttled = useFpsThrottledValue(tooReactive, {
 *   fpsFactor: 1 / 2, // update every 2nd frame
 *   maxFps: 10, // up to max 10 FPS
 * });
 * return <div>Throttled: {throttled}</div>;
 * ```
 * => component rerenders at `tooReactive` rate
 * => but repaint at `throttled` rate
 *
 * But because hook doesn't isolate the state from you component, you might want to also
 * use a wrapper component or context to isolate the fast rerenders.
 *
 * ```tsx
 * type ThirdPartyHookReturnType = ReturnType<typeof useThirdPartyHook>;
 * type ThrottledThirdPartyContextState = {
 *   throttled: ThirdPartyHookReturnType;
 * }
 * const ThrottledThirdPartyContext = createContext<ThrottledThirdPartyContextState>(null);
 * function ThrottledThirdPartyContextProvider({children}: {children: ReactNode}) {
 *   const tooReactive = useThirdPartyHook();
 *   const throttled = useFpsThrottledValue(tooReactive, {
 *     fpsFactor: 1 / 2, // update every 2nd frame
 *     maxFps: 10, // up to max 10 FPS
 *   });
 *   return <ThrottledThirdPartyContext.Provider value={{ throttled }}>
 *     {children}
 *   </ThrottledThirdPartyContext.Provider>;
 * }
 * function useThrottledThirdPartyContext() {
 *   const { throttled } = useContext(ThrottledThirdPartyContext);
 *   if (!throttled) {
 *     throw new Error("useThrottledThirdPartyContext must be used within a ThrottledThirdPartyContextProvider");
 *    }
 *   return throttled;
 * }
 * ```
 * then
 * ```tsx
 * function MyComponent() {
 *   const throttled = useThrottledThirdPartyContext();
 *   return <div>Throttled: {throttled}</div>;
 * }
 * function MyComponentWrapper() {
 *   return (
 *     <ThrottledThirdPartyContextProvider>
 *       <MyComponent />
 *     </ThrottledThirdPartyContextProvider>
 *   );
 * }
 * ```
 * => MyComponent rerenders at `throttled` rate
 * => also repaints at `throttled` rate
 * => only the ThrottledThirdPartyContextProvider rerenders at the `tooReactive` rate internally
 *    (but limited impact as it does not do anything but calling our throttle logic we would have called anyway)
 */

import type { RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export type FpsThrottlerOptions = {
  /**
   * Maximum frames per second.
   * Defines the minimum time interval between updates.
   * e.g., 15 means at least 66ms between updates.
   */
  maxFps?: number;

  /**
   * Factor of the native requestAnimationFrame speed to target.
   * e.g., 1/2 means update every 2nd frame.
   * Default is 1 (every frame).
   */
  fpsFactor?: number;

  isDebug?: boolean;
};

/**
 * Core Vanilla TS logic for throttling updates to requestAnimationFrame.
 */
export class FpsThrottler<T> {
  private value: T;
  private pendingValue: T | undefined;
  // private hasPendingUpdate = false;
  private readonly listeners: Set<(value: T) => void> = new Set();
  private rafId: number | null = null;
  private lastUpdateTime = 0;

  private minInterval = 0;
  private frameThreshold = 1;
  private framesSinceLastUpdate = 0;

  // FOR DEBUGGING
  private isDebug = false;
  private nbProcessedUpdates = 0;
  private nbRequestedUpdates = 0;
  private timeSinceLastUpdate = 0; // do 1000 / timeSinceLastUpdate to get FPS

  constructor(initialValue: T, options?: FpsThrottlerOptions) {
    this.value = initialValue;
    this.updateOptions(options);
  }

  get debugState() {
    if (!this.isDebug) return undefined;

    return {
      lastUpdateTime: this.lastUpdateTime,
      framesSinceLastUpdate: this.framesSinceLastUpdate,
      timeSinceLastUpdate: this.timeSinceLastUpdate,
      nbProcessedUpdates: this.nbProcessedUpdates,
      nbRequestedUpdates: this.nbRequestedUpdates,
    };
  }

  updateOptions(options?: FpsThrottlerOptions) {
    if (options?.maxFps && options.maxFps > 0) {
      this.minInterval = 1000 / options.maxFps;
    } else {
      this.minInterval = 0;
    }

    if (options?.fpsFactor && options.fpsFactor > 0) {
      // If factor is 0.5, we want 1 update every 2 frames. Threshold = 1/0.5 = 2.
      // If factor is 1, threshold = 1.
      this.frameThreshold = Math.max(1, Math.round(1 / options.fpsFactor));
    } else {
      this.frameThreshold = 1;
    }

    this.isDebug = options?.isDebug ?? false;
  }

  get current(): T {
    // If there's a pending update that hasn't been committed yet,
    // we might still want the *latest* known intention for functional updates?
    // Standard React useState callback gets the *committed* state.
    // But if we call set(prev => prev + 1) twice rapidly, the second one
    // should ideally see the result of the first one even if it's pending.
    // However, implementing full transactional semantics in a throttler is tricky.
    // For strictly throttled *visual* state, we usually want the last COMMITTED value
    // OR the last PENDING value if we are queueing updates.
    //
    // Current implementation: "current" is the COMMITTED value.
    // This mimics React's behavior where state doesn't change until render.
    return this.value;
  }

  /**
   * Returns the latest known value (pending or committed).
   * Useful for calculating next state in functional updates if we want to batch.
   */
  get latest(): T {
    return this.pendingValue !== undefined ? this.pendingValue : this.value;
  }

  set(newValue: T) {
    this.pendingValue = newValue;
    if (this.isDebug) {
      this.nbRequestedUpdates++;
    }

    if (this.rafId === null) {
      // Starting a new sequence.
      this.rafId = requestAnimationFrame(this.processUpdate);
    }
  }

  setInstant(newValue: T) {
    this.pendingValue = newValue;
    if (this.isDebug) {
      this.nbRequestedUpdates++;
    }

    // cancel any pending update
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // reset states
    this.lastUpdateTime = 0;
    this.framesSinceLastUpdate = 0;

    this.processUpdate(performance.now());
  }

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener);
    // If subscribed late but we have a value, we don't auto-fire
    // to avoid side effects during render phase if called there.
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.listeners.clear();
  }

  private readonly processUpdate = (timestamp: number) => {
    if (this.pendingValue === undefined) {
      this.rafId = null;
      return;
    }

    const timeElapsed = timestamp - this.lastUpdateTime;
    const timeAllowed = timeElapsed >= this.minInterval;
    const framesAllowed = this.framesSinceLastUpdate >= this.frameThreshold;

    if (timeAllowed && framesAllowed) {
      // FOR DEBUGGING
      if (this.isDebug) {
        this.nbProcessedUpdates++;
        this.timeSinceLastUpdate = timeElapsed;
      }

      // Apply the update
      this.value = this.pendingValue;
      this.pendingValue = undefined;
      this.lastUpdateTime = timestamp;
      this.framesSinceLastUpdate = 0; // Reset frame count

      // Notify listeners
      // Create a copy to avoid issues if listeners unsubscribe during execution
      const currentListeners = Array.from(this.listeners);
      for (const listener of currentListeners) {
        listener(this.value);
      }

      this.rafId = null;
    } else {
      // Not allowed yet, reschedule
      this.framesSinceLastUpdate++;
      this.rafId = requestAnimationFrame(this.processUpdate);
    }
  };
}

/**
 * A hook that acts like useState, but throttles updates to requestAnimationFrame speed (or lower).
 */
export function useFpsThrottledState<T>(
  initialState: T | (() => T),
  options?: FpsThrottlerOptions
): [
  T,
  (
    valueOrUpdater: SetStateAction<T>,
    opts?: {
      instant?: boolean;
    }
  ) => void,
  RefObject<FpsThrottler<T>>,
] {
  // Resolve initial state once
  const [initialValue] = useState(() =>
    initialState instanceof Function ? initialState() : initialState
  );

  // Create a stable throttler instance
  // We use a Ref to hold the throttler so we can lazily initialize it reliably
  // and handle disposal properly without strict mode double-invoke issues if we used useMemo
  const throttlerRef = useRef<FpsThrottler<T> | undefined>(undefined);

  if (throttlerRef.current === undefined) {
    throttlerRef.current = new FpsThrottler(initialValue, options);
  }

  const throttler = throttlerRef.current;

  // Sync options if they change
  // biome-ignore lint/correctness/useExhaustiveDependencies: no dep on full object
  useEffect(() => {
    throttler.updateOptions(options);
  }, [throttler, options?.maxFps, options?.fpsFactor]);

  // Local state to trigger re-renders
  const [state, setState] = useState<T>(initialValue);

  // Subscribe to throttler updates
  useEffect(() => {
    const unsubscribe = throttler.subscribe(setState);

    return () => {
      unsubscribe();
      throttler.dispose();
    };
  }, [throttler]);

  // Stable setter function
  const setThrottledState = useCallback(
    (valueOrUpdater: SetStateAction<T>, opts: { instant?: boolean } = {}) => {
      const isInstant = opts.instant ?? false;
      let newValue: T;
      if (valueOrUpdater instanceof Function) {
        newValue = valueOrUpdater(throttler.latest);
      } else {
        newValue = valueOrUpdater;
      }
      if (isInstant) {
        throttler.setInstant(newValue);
      } else {
        throttler.set(newValue);
      }
    },
    [throttler]
  );

  return [
    state,
    setThrottledState,
    throttlerRef as unknown as RefObject<FpsThrottler<T>>,
  ];
}

/**
 * A hook that throttles a value from another source (e.g. another hook).
 */
export function useFpsThrottledValue<T>(
  value: T | "skip",
  options?: FpsThrottlerOptions
): T | undefined {
  const isSkip = value === "skip";
  const wasSkipped = useRef(false);

  const [throttledState, setThrottledState] = useFpsThrottledState(
    isSkip ? undefined : value,
    options
  );

  useEffect(() => {
    if (isSkip) {
      wasSkipped.current = true;
      return;
    }
    if (wasSkipped.current) {
      wasSkipped.current = false;
      setThrottledState(value, { instant: true });
      return;
    }
    setThrottledState(value);
  }, [value, setThrottledState, isSkip]);

  return throttledState;
}

export function useFpsThrottledValueDEBUG<T>(
  value: T | "skip",
  options?: Omit<FpsThrottlerOptions, "isDebug">
): [T | undefined, FpsThrottler<T | undefined>] {
  const isSkip = value === "skip";
  const wasSkipped = useRef(false);
  const [throttledState, setThrottledState, throttlerRef] =
    useFpsThrottledState(isSkip ? undefined : value, {
      ...options,
      isDebug: true,
    });

  useEffect(() => {
    if (isSkip) {
      wasSkipped.current = true;
      return;
    }
    if (wasSkipped.current) {
      wasSkipped.current = false;
      setThrottledState(value, { instant: true });
      return;
    }
    setThrottledState(value);
  }, [value, setThrottledState, isSkip]);

  return [throttledState, throttlerRef.current];
}
