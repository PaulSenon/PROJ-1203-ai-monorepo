import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsIos } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface StickyContainerProps {
  children: React.ReactNode;
  className?: string;
}

// src https://github.com/almond-bongbong/react-bottom-fixed/blob/main/src/index.tsx

/**
 * Container that sticks to the bottom on mobile (fixed) and desktop (sticky).
 * Automatically adjusts for virtual keyboard on iOS using Visual Viewport API.
 *
 * Uses GPU-accelerated transform for smooth keyboard animations.
 */
export function StickyContainer({ children, className }: StickyContainerProps) {
  const isIos = useIsIos();

  const ref = useRef<HTMLDivElement>(null);
  const { isOpen, close } = useKeyboardOffset();
  const scrollTracker = useRef<ReturnType<typeof createScrollTracker> | null>(
    null
  );
  if (isIos && scrollTracker.current === null) {
    scrollTracker.current = createScrollTracker({ threshold: 300 });
  }

  useEffect(() => {
    if (!scrollTracker.current) return;
    if (!isOpen) {
      return () => scrollTracker?.current?.reset();
    }
    scrollTracker.current.onScrollUp(close);
    return () => scrollTracker?.current?.reset();
  }, [isOpen, close]);

  return (
    <div
      className={cn(
        "sticky bottom-[10px] mx-auto h-auto w-full transition-transform duration-150 ease-out md:sticky md:bottom-0 md:translate-y-0",
        "bottom-[10px]", // IOS 26 hack, should never be at the very bottom or if breaks fullscreen continuity
        className
      )}
      ref={ref}
    >
      {children}
    </div>
  );
}

/**
 * From: https://martijnhols.nl/blog/how-to-detect-the-on-screen-keyboard-in-ios-safari
 */
const isKeyboardInput = (elem: HTMLElement) =>
  (elem.tagName === "INPUT" &&
    !["button", "submit", "checkbox", "file", "image"].includes(
      (elem as HTMLInputElement).type
    )) ||
  elem.tagName === "TEXTAREA" ||
  elem.hasAttribute("contenteditable");

const useIsOnScreenKeyboardOpen = () => {
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (!e.target) {
        return;
      }
      const target = e.target as HTMLElement;
      console.log("isKeyboardInput", isKeyboardInput(target));
      console.log("isKeyboardInput", target.tagName);
      if (isKeyboardInput(target)) {
        setOpen(true);
      }
    };
    document.addEventListener("focusin", handleFocusIn);
    const handleFocusOut = (e: FocusEvent) => {
      if (!e.target) {
        return;
      }
      const target = e.target as HTMLElement;
      if (isKeyboardInput(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return isOpen;
};

const useKeyboardOffset = () => {
  const isOpen = useIsOnScreenKeyboardOpen();
  const [offset, setOffset] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    if (done.current) return;
    const cb = () => {
      setTimeout(() => {
        const vv = window.visualViewport;
        setOffset(vv?.offsetTop ?? 0);
        done.current = true;
      }, 300);
    };
    window.addEventListener("scroll", cb, { once: true });
    return () => {
      window.removeEventListener("scroll", cb);
    };
  }, [isOpen]);

  const close = useCallback(() => {
    if (isOpen && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    return;
  }, [isOpen]);
  return useMemo(
    () => ({
      isOpen,
      offset,
      close,
    }),
    [isOpen, offset, close]
  );
};

// function useStableWindowSize() {
//   const [size, setSize] = useState({
//     innerWidth: window.innerWidth,
//     innerHeight: window.innerHeight,
//     offsetTop: window.visualViewport?.offsetTop ?? 0,
//     pageTop: window.visualViewport?.pageTop ?? 0,
//   });
//   useEffect(() => {
//     const cb = () => {
//       setSize({
//         innerWidth: window.innerWidth,
//         innerHeight: window.innerHeight,
//         offsetTop: window.visualViewport?.offsetTop ?? 0,
//         pageTop: window.visualViewport?.pageTop ?? 0,
//       });
//     };
//     window.addEventListener("resize", cb);
//     return () => {
//       window.removeEventListener("resize", cb);
//     };
//   }, []);
//   return size;
// }

/**
 * AI generated... TODO: doublecheck
 */
function createScrollTracker({ threshold }: { threshold: number }) {
  let previousOffset = window.scrollY;
  let accumulatedDelta = 0;
  let onScrollUpCallback: (() => void) | null = null;
  let handleScroll: (() => void) | null = null;

  const getMaxScrollY = () =>
    document.documentElement.scrollHeight - window.innerHeight;

  const isValidScrollPosition = (scrollY: number) => {
    const maxScrollY = getMaxScrollY();
    return scrollY >= 0 && scrollY <= maxScrollY;
  };

  const reset = () => {
    previousOffset = window.scrollY;
    accumulatedDelta = 0;
    if (handleScroll) {
      window.removeEventListener("scroll", handleScroll);
      handleScroll = null;
    }
    onScrollUpCallback = null;
  };

  const processScroll = () => {
    const currentScrollY = window.scrollY;
    const isNowValid = isValidScrollPosition(currentScrollY);
    const wasValid = isValidScrollPosition(previousOffset);

    // Ignore overscroll bounce-back: snapping from invalid to valid position
    if (!wasValid && isNowValid) {
      previousOffset = currentScrollY;
      accumulatedDelta = 0;
      return;
    }

    // Ignore overscrolling - wait for snap back
    if (!isNowValid) {
      previousOffset = currentScrollY;
      return;
    }

    // Skip delta calculation if previous position was invalid
    if (!wasValid) {
      previousOffset = currentScrollY;
      return;
    }

    // Track real scroll movements
    const delta = currentScrollY - previousOffset;
    accumulatedDelta += delta;

    if (Math.abs(accumulatedDelta) >= threshold) {
      if (accumulatedDelta < 0 && onScrollUpCallback) {
        onScrollUpCallback();
      }
      accumulatedDelta = 0;
      previousOffset = currentScrollY;
    }
  };

  const onScrollUp = (callback: () => void) => {
    onScrollUpCallback = callback;
    if (handleScroll) {
      return;
    }

    handleScroll = processScroll;
    window.addEventListener("scroll", handleScroll, { passive: true });
  };

  return { onScrollUp, reset };
}
