import type { RefObject } from "react";
import { useCallback, useLayoutEffect, useRef } from "react";

type InitialScrollTarget = "bottom" | { selector: string };

type UseInitialScrollOptions = {
  containerRef?: RefObject<HTMLElement | null>;
  to: InitialScrollTarget;
  enabled?: boolean;
};

export function useInitialScroll({
  containerRef,
  to,
  enabled = true,
}: UseInitialScrollOptions) {
  const hasScrolledRef = useRef(false);

  const scrollToTarget = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = containerRef?.current;
      if (!container) return;

      if (to === "bottom") {
        const targetTop = Math.max(
          0,
          container.scrollHeight - container.clientHeight
        );
        container.scrollTo({ top: targetTop, behavior });
        return;
      }

      if ("selector" in to) {
        const scoped = (container as HTMLElement).querySelector<HTMLElement>(
          to.selector
        );
        if (!scoped) return;
        const containerRect = container.getBoundingClientRect();
        const targetRect = scoped.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({ top: offset, behavior });
      }
    },
    [containerRef, to]
  );

  useLayoutEffect(() => {
    if (!enabled) return;
    if (hasScrolledRef.current) return;
    hasScrolledRef.current = true;

    // First pass before paint
    scrollToTarget("auto");
  }, [enabled, scrollToTarget]);
}
