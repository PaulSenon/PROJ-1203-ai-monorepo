import { useCallback, useEffect, useRef } from "react";

type ViewportOnceOptions = {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
};

const viewportTriggeredKeys = new Set<string>();
const mouseEnterTriggeredKeys = new Set<string>();

/**
 * Hook that triggers a callback once when an element enters the viewport.
 * Uses Intersection Observer for efficient viewport detection.
 * Tracks triggered keys globally to ensure callback fires only once per key.
 */
export function useViewportOnce<T extends HTMLElement = HTMLElement>(
  key: string,
  callback: () => void,
  options?: ViewportOnceOptions
) {
  const elementRef = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const stableCallback = useCallback(() => {
    if (viewportTriggeredKeys.has(key)) return;
    viewportTriggeredKeys.add(key);
    callback();
  }, [key, callback]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (viewportTriggeredKeys.has(key)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            stableCallback();
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: options?.threshold ?? 0,
        rootMargin: options?.rootMargin,
        root: options?.root ?? null,
      }
    );

    observerRef.current = observer;
    observer.observe(element);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [
    key,
    stableCallback,
    options?.threshold,
    options?.rootMargin,
    options?.root,
  ]);

  return elementRef;
}

/**
 * Hook that triggers a callback once when the mouse enters an element.
 * Uses mouseenter event for efficient mouse detection.
 * Tracks triggered keys globally to ensure callback fires only once per key.
 */
export function useMouseEnterOnce<T extends HTMLElement = HTMLElement>(
  key: string,
  callback: () => void
) {
  const elementRef = useRef<T | null>(null);

  const stableCallback = useCallback(() => {
    if (mouseEnterTriggeredKeys.has(key)) return;
    mouseEnterTriggeredKeys.add(key);
    callback();
  }, [key, callback]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (mouseEnterTriggeredKeys.has(key)) return;

    const handleMouseEnter = () => {
      stableCallback();
      element.removeEventListener("mouseenter", handleMouseEnter);
    };

    element.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [key, stableCallback]);

  return elementRef;
}
