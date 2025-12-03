"use client";

import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * @example
 * ```tsx
 * const viewportRef = useRef<HTMLDivElement>(null);
 * const { isAtTop, isAtBottom, topRef, bottomRef } = useScrollEdges(viewportRef);
 * return (
 *   <ScrollArea>
 *     <ScrollAreaViewport ref={viewportRef}>
 *       <ScrollEdgeProbe ref={topRef}/>
 *        //content
 *       <ScrollEdgeProbe ref={bottomRef}/>
 *     </ScrollAreaViewport>
 *   </ScrollArea>
 * );
 * ```
 */
export function useScrollEdges<T extends HTMLElement>(
  rootRef: React.RefObject<T | null>,
  options?: Omit<IntersectionObserverInit, "root">
) {
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Using state instead of refs - triggers effect when probes mount
  const [topEl, setTopEl] = useState<HTMLDivElement | null>(null);
  const [bottomEl, setBottomEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!(root && topEl && bottomEl)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === topEl) setIsAtTop(entry.isIntersecting);
          else if (entry.target === bottomEl)
            setIsAtBottom(entry.isIntersecting);
        }
      },
      { threshold: 0, ...options, root }
    );

    observer.observe(topEl);
    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, [rootRef, topEl, bottomEl, options]);

  return { isAtTop, isAtBottom, topRef: setTopEl, bottomRef: setBottomEl };
}

export function ScrollEdgeProbe({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "-mt-px pointer-events-none invisible m-0 h-px w-full shrink-0 p-0",
        className
      )}
      {...props}
    />
  );
}
