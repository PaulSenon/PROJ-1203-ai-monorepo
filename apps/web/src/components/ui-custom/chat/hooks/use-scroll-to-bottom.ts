import type { RefObject } from "react";
import { useEffect, useState } from "react";

type UseScrollToBottomOptions = {
  containerRef?: RefObject<HTMLDivElement | null>;
  /** Pixel leeway before considering we are at bottom */
  threshold?: number;
};

type UseScrollToBottomReturn = {
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
};

export function useScrollToBottom(
  options: UseScrollToBottomOptions = {}
): UseScrollToBottomReturn {
  const { containerRef, threshold = 8 } = options;
  const [isAtBottom, setIsAtBottom] = useState(true);

  const getContainer = () => {
    if (typeof document === "undefined") return null;
    return containerRef?.current ?? document.documentElement ?? null;
  };

  useEffect(() => {
    const target = getContainer();
    if (!target) return;

    const handleScroll = () => {
      const scrollTop = target.scrollTop;
      const clientHeight = target.clientHeight;
      const scrollHeight = target.scrollHeight;
      const atBottom = scrollTop + clientHeight >= scrollHeight - threshold;
      setIsAtBottom(atBottom);
    };

    // Run once on mount to set initial state
    handleScroll();

    target.addEventListener("scroll", handleScroll, { passive: true });
    return () => target.removeEventListener("scroll", handleScroll);
  }, [containerRef, threshold]);

  const scrollToBottom = (behavior: ScrollBehavior = "instant") => {
    const target = getContainer();
    if (!target) return;
    target.scrollTo({ top: target.scrollHeight, behavior });
  };

  return { isAtBottom, scrollToBottom };
}
