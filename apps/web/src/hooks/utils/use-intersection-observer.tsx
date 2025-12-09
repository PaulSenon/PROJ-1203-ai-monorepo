import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TargetElement<T extends Element = Element> = T | null;

type IntersectionObserverHookOptions = Omit<
  IntersectionObserverInit,
  "root"
> & {
  root?: Element | null;
  rootRef?: RefObject<Element | null>;
  disabled?: boolean;
  freezeOnceVisible?: boolean;
  onChange?: (entry: IntersectionObserverEntry) => void;
};

type UseIntersectionObserverResult<T extends Element = Element> = {
  ref: (node: TargetElement<T>) => void;
  entry: IntersectionObserverEntry | null;
  inView: boolean;
};

type UseInViewOptions = IntersectionObserverHookOptions & {
  triggerOnce?: boolean;
  initialInView?: boolean;
  minRatio?: number;
  onEnter?: (entry: IntersectionObserverEntry) => void;
  onLeave?: (entry: IntersectionObserverEntry) => void;
  onChange?: (inView: boolean, entry: IntersectionObserverEntry) => void;
};

type UseInViewResult<T extends Element = Element> =
  UseIntersectionObserverResult<T> & {
    wasEverInView: boolean;
  };

type ObserverInstance = {
  observer: IntersectionObserver;
  elements: Map<Element, (entry: IntersectionObserverEntry) => void>;
};

const rootIds = new WeakMap<Element, number>();
const observers = new Map<string, ObserverInstance>();
let rootIdCounter = 0;

const getRootId = (root: Element | null) => {
  if (!root) return "null";
  const existing = rootIds.get(root);
  if (existing) return String(existing);
  const id = rootIdCounter + 1;
  rootIdCounter = id;
  rootIds.set(root, id);
  return String(id);
};

const getThresholdKey = (threshold: IntersectionObserverInit["threshold"]) => {
  if (Array.isArray(threshold)) {
    return threshold.join(",");
  }
  return threshold ?? "0";
};

const getObserver = ({
  root,
  rootMargin,
  threshold,
}: {
  root: Element | null;
  rootMargin: string | undefined;
  threshold: IntersectionObserverInit["threshold"];
}) => {
  const key = `${getRootId(root)}|${rootMargin ?? "0px"}|${getThresholdKey(threshold)}`;
  const existing = observers.get(key);
  if (existing) {
    return { key, instance: existing };
  }

  const elements = new Map<
    Element,
    (entry: IntersectionObserverEntry) => void
  >();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const handler = elements.get(entry.target);
        if (handler) handler(entry);
      }
    },
    { root, rootMargin, threshold }
  );

  const instance: ObserverInstance = { observer, elements };
  observers.set(key, instance);

  return { key, instance };
};

export function useIntersectionObserver<T extends Element = Element>(
  options: IntersectionObserverHookOptions = {}
): UseIntersectionObserverResult<T> {
  const {
    root,
    rootRef,
    rootMargin,
    threshold = 0,
    disabled,
    freezeOnceVisible,
    onChange,
  } = options;

  const targetRef = useRef<TargetElement<T>>(null);
  const frozenRef = useRef(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  const effectiveRoot = rootRef?.current ?? root ?? null;
  const thresholds = useMemo(
    () => (Array.isArray(threshold) ? threshold : [threshold]),
    [threshold]
  );

  const setTarget = useCallback((node: TargetElement<T>) => {
    targetRef.current = node;
  }, []);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    if (disabled) return;
    if (frozenRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    const { key, instance } = getObserver({
      root: effectiveRoot,
      rootMargin,
      threshold: thresholds,
    });

    const handleEntry = (next: IntersectionObserverEntry) => {
      if (freezeOnceVisible && next.isIntersecting) {
        frozenRef.current = true;
      }

      onChange?.(next);

      setEntry((prev) => {
        if (
          prev &&
          prev.target === next.target &&
          prev.isIntersecting === next.isIntersecting &&
          prev.intersectionRatio === next.intersectionRatio
        ) {
          return prev;
        }
        return next;
      });

      if (freezeOnceVisible && next.isIntersecting) {
        instance.observer.unobserve(next.target);
      }
    };

    instance.elements.set(target, handleEntry);
    instance.observer.observe(target);

    return () => {
      instance.elements.delete(target);
      instance.observer.unobserve(target);
      if (instance.elements.size === 0) {
        instance.observer.disconnect();
        observers.delete(key);
      }
    };
  }, [
    disabled,
    effectiveRoot,
    freezeOnceVisible,
    onChange,
    rootMargin,
    thresholds,
  ]);

  return {
    ref: setTarget,
    entry,
    inView: Boolean(entry?.isIntersecting),
  };
}

export function useInView<T extends Element = Element>(
  options: UseInViewOptions = {}
): UseInViewResult<T> {
  const {
    triggerOnce,
    initialInView = false,
    minRatio = 0,
    onEnter,
    onLeave,
    onChange,
    threshold,
    freezeOnceVisible,
    ...baseOptions
  } = options;

  const [inView, setInView] = useState(initialInView);
  const [wasEverInView, setWasEverInView] = useState(initialInView);
  const prevInViewRef = useRef(initialInView);

  const normalizedThreshold = useMemo(() => {
    const list = Array.isArray(threshold)
      ? threshold.slice()
      : [threshold ?? 0];
    if (!list.includes(minRatio)) {
      list.push(minRatio);
    }
    return list.sort((a, b) => a - b);
  }, [minRatio, threshold]);

  const { ref, entry } = useIntersectionObserver({
    ...baseOptions,
    threshold: normalizedThreshold,
    freezeOnceVisible: freezeOnceVisible ?? triggerOnce,
  });

  useEffect(() => {
    if (!entry) return;
    if (triggerOnce && wasEverInView) return;

    const nextInView =
      entry.isIntersecting && entry.intersectionRatio >= minRatio;
    const prevInView = prevInViewRef.current;

    if (nextInView !== prevInView) {
      if (nextInView) onEnter?.(entry);
      else onLeave?.(entry);
      onChange?.(nextInView, entry);
      prevInViewRef.current = nextInView;
      setInView(nextInView);
      if (nextInView) setWasEverInView(true);
    }
  }, [entry, minRatio, onChange, onEnter, onLeave, triggerOnce, wasEverInView]);

  return {
    ref,
    entry,
    inView,
    wasEverInView,
  };
}
