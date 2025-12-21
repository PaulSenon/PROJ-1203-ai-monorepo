"use client";

import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ============================================================================
// Types
// ============================================================================

type ScrollBehaviorMode = "instant" | "smooth";

type ProviderOptions = {
  /**
   * Optional scroll container ref. If not provided, uses document scrolling element.
   */
  containerRef?: RefObject<HTMLElement | null>;
  /**
   * Padding from top of viewport when scrolling probe into view (px).
   * @default 0
   */
  topPadding?: number;
};

type ScrollState = {
  /** Whether the bottom probe is currently visible in viewport */
  isAtBottom: boolean;
  /** Whether the checkpoint probe is currently visible in viewport */
  isAtCheckpoint: boolean;
  /** Ref callback - attach to bottom probe element */
  bottomRef: (node: HTMLElement | null) => void;
  /** Ref callback - attach to checkpoint probe element */
  checkpointRef: (node: HTMLElement | null) => void;
};

type ScrollActions = {
  /** Scroll to make the bottom probe visible at top of viewport */
  scrollToBottom: (behavior?: ScrollBehaviorMode) => void;
  /** Scroll to make the checkpoint probe visible at top of viewport */
  scrollToCheckpoint: (behavior?: ScrollBehaviorMode) => void;
  /** Check if probe is currently visible (without triggering scroll) */
  isProbeVisible: (probe: "bottom" | "checkpoint") => boolean;
};

type ScrollInitOptions = {
  /** Enable the initial scroll */
  enabled: boolean;
  /** Which probe to scroll to */
  target?: "bottom" | "checkpoint";
  /** Scroll behavior */
  behavior?: ScrollBehaviorMode;
  /** Re-run when this key changes (useful for route/thread changes) */
  runKey?: string | number;
  /** Skip scroll if probe already visible */
  skipIfVisible?: boolean;
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the scroll container element.
 */
function getScrollContainer(
  containerRef?: RefObject<HTMLElement | null>
): Element | null {
  if (typeof window === "undefined") return null;
  if (containerRef?.current) return containerRef.current;
  return document.scrollingElement ?? document.documentElement;
}

/**
 * Check if an element is visible within the scroll container.
 */
function isElementVisible(
  element: HTMLElement,
  container: Element | null
): boolean {
  if (!container) return false;

  const elRect = element.getBoundingClientRect();

  // For document scrolling, viewport is the window
  if (
    container === document.scrollingElement ||
    container === document.documentElement
  ) {
    return elRect.top < window.innerHeight && elRect.bottom > 0;
  }

  // For custom container
  const containerRect = container.getBoundingClientRect();
  return elRect.top < containerRect.bottom && elRect.bottom > containerRect.top;
}

/**
 * Scroll an element to the top of the viewport (or as close as scroll allows).
 * Uses scrollIntoView with block: 'start' for maximum compatibility.
 */
function scrollProbeToTop(
  element: HTMLElement,
  container: Element | null,
  behavior: ScrollBehaviorMode,
  topPadding: number
): void {
  if (!container) return;

  const scrollBehavior = behavior === "instant" ? "auto" : "smooth";

  // For document scrolling with no padding, use native scrollIntoView
  if (
    topPadding === 0 &&
    (container === document.scrollingElement ||
      container === document.documentElement)
  ) {
    element.scrollIntoView({ block: "start", behavior: scrollBehavior });
    return;
  }

  // Calculate scroll position with padding
  const elRect = element.getBoundingClientRect();

  if (
    container === document.scrollingElement ||
    container === document.documentElement
  ) {
    const currentScrollY = window.scrollY;
    const targetTop = currentScrollY + elRect.top - topPadding;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: scrollBehavior });
    return;
  }

  // Custom container
  const containerRect = container.getBoundingClientRect();
  const currentScrollTop = container.scrollTop;
  const targetTop =
    currentScrollTop + (elRect.top - containerRect.top) - topPadding;
  container.scrollTo({
    top: Math.max(0, targetTop),
    behavior: scrollBehavior,
  });
}

// ============================================================================
// Context
// ============================================================================

const ScrollStateContext = createContext<ScrollState | null>(null);
const ScrollActionsContext = createContext<ScrollActions | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function ScrollToBottomProvider({
  children,
  containerRef,
  topPadding = 0,
}: ProviderOptions & { children: ReactNode }) {
  // Use state to track probe elements so we can trigger IntersectionObserver setup
  const [bottomEl, setBottomEl] = useState<HTMLElement | null>(null);
  const [checkpointEl, setCheckpointEl] = useState<HTMLElement | null>(null);

  // Also keep refs for synchronous access in scroll functions
  const bottomElRef = useRef<HTMLElement | null>(null);
  const checkpointElRef = useRef<HTMLElement | null>(null);

  // Visibility state
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtCheckpoint, setIsAtCheckpoint] = useState(false);

  // Ref callbacks for consumers - update both state and ref
  const bottomRef = useCallback((node: HTMLElement | null) => {
    bottomElRef.current = node;
    setBottomEl(node);
  }, []);

  const checkpointRef = useCallback((node: HTMLElement | null) => {
    checkpointElRef.current = node;
    setCheckpointEl(node);
  }, []);

  // Setup IntersectionObserver for visibility tracking
  useLayoutEffect(() => {
    if (!(bottomEl || checkpointEl)) return;

    const container = getScrollContainer(containerRef);
    if (!container) return;

    // For IntersectionObserver, null root = viewport
    const root =
      container === document.scrollingElement ||
      container === document.documentElement
        ? null
        : container;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === bottomEl) {
            setIsAtBottom(entry.isIntersecting);
          } else if (entry.target === checkpointEl) {
            setIsAtCheckpoint(entry.isIntersecting);
          }
        }
      },
      { root, threshold: 0 }
    );

    if (bottomEl) observer.observe(bottomEl);
    if (checkpointEl) observer.observe(checkpointEl);

    return () => observer.disconnect();
  }, [bottomEl, checkpointEl, containerRef]);

  // Actions - use refs for synchronous access
  const isProbeVisible = useCallback(
    (probe: "bottom" | "checkpoint"): boolean => {
      const el =
        probe === "bottom" ? bottomElRef.current : checkpointElRef.current;
      if (!el) return false;
      const container = getScrollContainer(containerRef);
      return isElementVisible(el, container);
    },
    [containerRef]
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehaviorMode = "smooth") => {
      const el = bottomElRef.current;
      if (!el) return;
      const container = getScrollContainer(containerRef);
      scrollProbeToTop(el, container, behavior, topPadding);
    },
    [containerRef, topPadding]
  );

  const scrollToCheckpoint = useCallback(
    (behavior: ScrollBehaviorMode = "smooth") => {
      const el = checkpointElRef.current;
      if (!el) return;
      const container = getScrollContainer(containerRef);
      scrollProbeToTop(el, container, behavior, topPadding);
    },
    [containerRef, topPadding]
  );

  // Memoized context values
  const state = useMemo<ScrollState>(
    () => ({ isAtBottom, isAtCheckpoint, bottomRef, checkpointRef }),
    [isAtBottom, isAtCheckpoint, bottomRef, checkpointRef]
  );

  const actions = useMemo<ScrollActions>(
    () => ({ scrollToBottom, scrollToCheckpoint, isProbeVisible }),
    [scrollToBottom, scrollToCheckpoint, isProbeVisible]
  );

  return (
    <ScrollActionsContext value={actions}>
      <ScrollStateContext value={state}>{children}</ScrollStateContext>
    </ScrollActionsContext>
  );
}

// ============================================================================
// Consumer Hooks
// ============================================================================

export function useScrollToBottomState(): ScrollState {
  const ctx = useContext(ScrollStateContext);
  if (!ctx) {
    throw new Error(
      "useScrollToBottomState: must be used within ScrollToBottomProvider"
    );
  }
  return ctx;
}

export function useScrollToBottomActions(): ScrollActions {
  const ctx = useContext(ScrollActionsContext);
  if (!ctx) {
    throw new Error(
      "useScrollToBottomActions: must be used within ScrollToBottomProvider"
    );
  }
  return ctx;
}

// ============================================================================
// Init Scroll Hook
// ============================================================================

/**
 * Trigger an initial scroll to a probe before first paint.
 * Runs once per `runKey` (or once if no key provided).
 * Optionally skips if probe is already visible.
 */
export function useScrollToBottomInit({
  enabled,
  target = "bottom",
  behavior = "instant",
  runKey,
  skipIfVisible = true,
}: ScrollInitOptions): void {
  const { scrollToBottom, scrollToCheckpoint, isProbeVisible } =
    useScrollToBottomActions();
  const didRunRef = useRef<string | number | "__once__" | null>(null);

  useLayoutEffect(() => {
    if (!enabled) return;

    const nextKey = runKey ?? "__once__";
    if (didRunRef.current === nextKey) return;
    didRunRef.current = nextKey;

    // Skip if already visible
    if (skipIfVisible && isProbeVisible(target)) return;

    if (target === "checkpoint") {
      scrollToCheckpoint(behavior);
    } else {
      scrollToBottom(behavior);
    }
  }, [
    enabled,
    target,
    behavior,
    runKey,
    skipIfVisible,
    scrollToBottom,
    scrollToCheckpoint,
    isProbeVisible,
  ]);
}

// ============================================================================
// Standalone Hook (for use without Provider - e.g., scoped containers)
// ============================================================================

type UseScrollToBottomOptions = ProviderOptions;

type UseScrollToBottomReturn = {
  isAtBottom: boolean;
  bottomRef: (node: HTMLElement | null) => void;
  scrollToBottom: (behavior?: ScrollBehaviorMode) => void;
  isProbeVisible: () => boolean;
};

/**
 * Standalone hook for scroll-to-bottom without Provider.
 * Useful for isolated scroll containers (e.g., modals, demo components).
 */
export function useScrollToBottom(
  opts: UseScrollToBottomOptions = {}
): UseScrollToBottomReturn {
  const { containerRef, topPadding = 0 } = opts;

  const [bottomEl, setBottomEl] = useState<HTMLElement | null>(null);
  const bottomElRef = useRef<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const bottomRef = useCallback((node: HTMLElement | null) => {
    bottomElRef.current = node;
    setBottomEl(node);
  }, []);

  // IntersectionObserver for visibility
  useLayoutEffect(() => {
    if (!bottomEl) return;

    const container = getScrollContainer(containerRef);
    if (!container) return;

    const root =
      container === document.scrollingElement ||
      container === document.documentElement
        ? null
        : container;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setIsAtBottom(entry.isIntersecting);
      },
      { root, threshold: 0 }
    );

    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, [bottomEl, containerRef]);

  const isProbeVisible = useCallback((): boolean => {
    const el = bottomElRef.current;
    if (!el) return false;
    const container = getScrollContainer(containerRef);
    return isElementVisible(el, container);
  }, [containerRef]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehaviorMode = "smooth") => {
      const el = bottomElRef.current;
      if (!el) return;
      const container = getScrollContainer(containerRef);
      scrollProbeToTop(el, container, behavior, topPadding);
    },
    [containerRef, topPadding]
  );

  return { isAtBottom, bottomRef, scrollToBottom, isProbeVisible };
}
