"use client";

import {
  type ComponentProps,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type UseScrollEdgesObserverOptions = Omit<IntersectionObserverInit, "root">;

type UseScrollEdgesOptions<T extends HTMLElement> =
  UseScrollEdgesObserverOptions & {
    viewportRef?: RefObject<T | null> | null;
    onTopReached?: () => void;
    onBottomReached?: () => void;
  };

/**
 * @example
 * ```tsx
 * const viewportRef = useRef<HTMLDivElement>(null);
 * const { isAtTop, isAtBottom, topRef, bottomRef } = useScrollEdges({
 *   viewportRef,
 *   threshold: 0,
 *   onTopReached: () => {},
 *   onBottomReached: () => {},
 * });
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
  options?: UseScrollEdgesOptions<T>
) {
  const rootRef = options?.viewportRef;

  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const onTopReachedRef = useRef<(() => void) | undefined>(
    options?.onTopReached
  );
  const onBottomReachedRef = useRef<(() => void) | undefined>(
    options?.onBottomReached
  );
  const topIntersectingRef = useRef<boolean | null>(null);
  const bottomIntersectingRef = useRef<boolean | null>(null);

  // Using state instead of refs - triggers effect when probes mount
  const [topEl, setTopEl] = useState<HTMLDivElement | null>(null);
  const [bottomEl, setBottomEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    onTopReachedRef.current = options?.onTopReached;
    onBottomReachedRef.current = options?.onBottomReached;
  }, [options?.onTopReached, options?.onBottomReached]);

  useEffect(() => {
    const root = rootRef?.current ?? null;
    if (!(topEl && bottomEl)) {
      return;
    }

    const {
      onTopReached: _onTopReached,
      onBottomReached: _onBottomReached,
      ...observerOptions
    } = options ?? {};

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === topEl) {
            const prev = topIntersectingRef.current;
            if (prev !== true && entry.isIntersecting) {
              onTopReachedRef.current?.();
            }
            topIntersectingRef.current = entry.isIntersecting;
            setIsAtTop(entry.isIntersecting);
          } else if (entry.target === bottomEl) {
            const prev = bottomIntersectingRef.current;
            if (prev !== true && entry.isIntersecting) {
              onBottomReachedRef.current?.();
            }
            bottomIntersectingRef.current = entry.isIntersecting;
            setIsAtBottom(entry.isIntersecting);
          }
        }
      },
      { threshold: 0, ...observerOptions, root }
    );

    observer.observe(topEl);
    observer.observe(bottomEl);
    return () => {
      observer.disconnect();
      topIntersectingRef.current = null;
      bottomIntersectingRef.current = null;
    };
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
