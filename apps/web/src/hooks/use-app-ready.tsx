import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { createControllablePromise } from "@/helpers/controllable-promise-helper";

export type AppReadyLoopKind = "initial-load" | "navigation";

export type AppReadyDestination =
  | "sidebar-content"
  | "sidebar-floating-actions"
  | "conversation-content";

export type AppReadyScope = "sidebar" | "conversation";

export type AppReadySignal =
  | "sidebar-thread-history-layout"
  | "conversation-layout";

export type AppReadyNavigationIdentity = {
  routeKind: "chat-thread";
  threadId: string | null;
};

type AppReadyTransitionPreset = "none" | "fast" | "normal";

type AppReadyTransition = {
  preset: AppReadyTransitionPreset;
  durationMs: number;
  easing: string;
};

type AppReadyPhase = "hidden" | "revealing" | "visible";

type AppReadyState = {
  cycleId: number;
  loopKind: AppReadyLoopKind;
  phase: AppReadyPhase;
  hiddenDestinations: readonly AppReadyDestination[];
  requiredScopes: readonly AppReadyScope[];
  readyScopes: readonly AppReadyScope[];
  transition: AppReadyTransition;
  startedAtMs: number;
};

type AppReadyStore = {
  cleanup: () => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AppReadyState;
  signalReady: (signal: AppReadySignal, cycleId: number) => void;
  publishNavigationIdentity: (identity: AppReadyNavigationIdentity) => void;
};

const APP_READY_TRANSITIONS: Record<
  AppReadyTransitionPreset,
  AppReadyTransition
> = {
  none: {
    preset: "none",
    durationMs: 0,
    easing: "linear",
  },
  fast: {
    preset: "fast",
    durationMs: 150,
    easing: "var(--ease-snappy)",
  },
  normal: {
    preset: "normal",
    durationMs: 250,
    easing: "var(--ease-snappy)",
  },
};

const appReadyConfig = {
  scopeSignals: {
    sidebar: ["sidebar-thread-history-layout"],
    conversation: ["conversation-layout"],
  },
  loops: {
    "initial-load": {
      hiddenDestinations: [
        "sidebar-content",
        "sidebar-floating-actions",
        "conversation-content",
      ],
      requiredScopes: ["sidebar", "conversation"],
      transitionPolicy: "normal",
    },
    navigation: {
      hiddenDestinations: ["conversation-content"],
      requiredScopes: ["conversation"],
      transitionPolicy: "adaptive-by-wait",
    },
  },
} satisfies {
  scopeSignals: Record<AppReadyScope, readonly AppReadySignal[]>;
  loops: Record<
    AppReadyLoopKind,
    {
      hiddenDestinations: readonly AppReadyDestination[];
      requiredScopes: readonly AppReadyScope[];
      transitionPolicy: "normal" | "adaptive-by-wait";
    }
  >;
};

const AppReadyStoreContext = createContext<AppReadyStore | null>(null);

// Global lock for non-react deferred work (preload, background warmups, etc).
export const appLoadPromise = createControllablePromise<void>();

function getNowMs() {
  return performance.now();
}

function isReducedMotionEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function areNavigationIdentitiesEqual(
  a: AppReadyNavigationIdentity,
  b: AppReadyNavigationIdentity
) {
  return a.routeKind === b.routeKind && a.threadId === b.threadId;
}

const DURATION_SKIP_TRANSITION_MS = 150;
const DURATION_FAST_TRANSITION_MS = 300;
function resolveTransitionPreset(
  loopKind: AppReadyLoopKind,
  waitDurationMs: number
): AppReadyTransitionPreset {
  if (isReducedMotionEnabled()) {
    return "none";
  }

  if (loopKind === "initial-load") {
    return "normal";
  }

  if (waitDurationMs < DURATION_SKIP_TRANSITION_MS) {
    return "none";
  }

  if (waitDurationMs < DURATION_FAST_TRANSITION_MS) {
    return "fast";
  }

  return "normal";
}

function toSignalToScopeMap() {
  const signalToScope = new Map<AppReadySignal, AppReadyScope>();

  for (const scope of Object.keys(
    appReadyConfig.scopeSignals
  ) as AppReadyScope[]) {
    for (const signal of appReadyConfig.scopeSignals[scope]) {
      signalToScope.set(signal, scope);
    }
  }

  return signalToScope;
}

function toRequiredSignalsByScopeMap() {
  const requiredSignalsByScope = new Map<
    AppReadyScope,
    ReadonlySet<AppReadySignal>
  >();

  for (const scope of Object.keys(
    appReadyConfig.scopeSignals
  ) as AppReadyScope[]) {
    requiredSignalsByScope.set(
      scope,
      new Set(appReadyConfig.scopeSignals[scope])
    );
  }

  return requiredSignalsByScope;
}

function createAppReadyStore(): AppReadyStore {
  const listeners = new Set<() => void>();
  const signalToScope = toSignalToScopeMap();
  const requiredSignalsByScope = toRequiredSignalsByScopeMap();
  const initialLoadConfig = appReadyConfig.loops["initial-load"];

  let state: AppReadyState = {
    cycleId: 1,
    loopKind: "initial-load",
    phase: "hidden",
    hiddenDestinations: initialLoadConfig.hiddenDestinations,
    requiredScopes: initialLoadConfig.requiredScopes,
    readyScopes: [],
    transition: APP_READY_TRANSITIONS.none,
    startedAtMs: getNowMs(),
  };
  let previousIdentity: AppReadyNavigationIdentity | null = null;
  let revealAnimationFrame: number | null = null;
  let revealTimeout: ReturnType<typeof setTimeout> | null = null;
  let readySignalsByScope = new Map<AppReadyScope, Set<AppReadySignal>>(
    initialLoadConfig.requiredScopes.map(
      (scope): [AppReadyScope, Set<AppReadySignal>] => [
        scope,
        new Set<AppReadySignal>(),
      ]
    )
  );

  const notify = () => {
    for (const listener of Array.from(listeners)) {
      listener();
    }
  };

  const syncAppLoadPromise = () => {
    if (state.phase === "visible") {
      appLoadPromise.resolve();
      return;
    }

    appLoadPromise.suspend();
  };

  const setState = (nextState: AppReadyState) => {
    state = nextState;
    syncAppLoadPromise();
    notify();
  };

  const clearRevealTimers = () => {
    if (revealAnimationFrame !== null) {
      cancelAnimationFrame(revealAnimationFrame);
      revealAnimationFrame = null;
    }

    if (revealTimeout === null) {
      return;
    }

    clearTimeout(revealTimeout);
    revealTimeout = null;
  };

  const releaseCurrentLoop = () => {
    const waitDurationMs = Math.max(0, getNowMs() - state.startedAtMs);
    const preset = resolveTransitionPreset(state.loopKind, waitDurationMs);
    const transition = APP_READY_TRANSITIONS[preset];

    if (transition.preset === "none") {
      setState({
        ...state,
        transition,
        phase: "visible",
      });
      return;
    }

    const releasingCycleId = state.cycleId;

    // Defer reveal start to next frame so hidden phase can paint at least once.
    revealAnimationFrame = requestAnimationFrame(() => {
      revealAnimationFrame = null;

      if (state.cycleId !== releasingCycleId) {
        return;
      }

      setState({
        ...state,
        transition,
        phase: "revealing",
      });

      revealTimeout = setTimeout(() => {
        revealTimeout = null;

        if (state.cycleId !== releasingCycleId) {
          return;
        }

        setState({
          ...state,
          phase: "visible",
        });
      }, transition.durationMs);
    });
  };

  const startLoop = (loopKind: AppReadyLoopKind) => {
    clearRevealTimers();

    const loopConfig = appReadyConfig.loops[loopKind];
    const nextCycleId = state.cycleId + 1;

    readySignalsByScope = new Map<AppReadyScope, Set<AppReadySignal>>(
      loopConfig.requiredScopes.map(
        (scope): [AppReadyScope, Set<AppReadySignal>] => [
          scope,
          new Set<AppReadySignal>(),
        ]
      )
    );

    setState({
      cycleId: nextCycleId,
      loopKind,
      phase: "hidden",
      hiddenDestinations: loopConfig.hiddenDestinations,
      requiredScopes: loopConfig.requiredScopes,
      readyScopes: [],
      transition: APP_READY_TRANSITIONS.none,
      startedAtMs: getNowMs(),
    });
  };

  const maybeReleaseLoop = () => {
    const allReady = state.requiredScopes.every((scope) =>
      state.readyScopes.includes(scope)
    );

    if (!allReady) {
      return;
    }

    releaseCurrentLoop();
  };

  syncAppLoadPromise();

  return {
    cleanup: () => {
      clearRevealTimers();
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    signalReady: (signal, cycleId) => {
      // Ignore stale signals emitted by older, preempted cycles.
      if (cycleId !== state.cycleId) {
        return;
      }

      const scope = signalToScope.get(signal);
      if (scope === undefined) {
        return;
      }

      if (!state.requiredScopes.includes(scope)) {
        return;
      }

      if (state.readyScopes.includes(scope)) {
        return;
      }

      const readySignals = readySignalsByScope.get(scope);
      if (readySignals === undefined) {
        return;
      }

      if (readySignals.has(signal)) {
        return;
      }

      readySignals.add(signal);

      const requiredSignals = requiredSignalsByScope.get(scope);
      if (requiredSignals === undefined) {
        return;
      }

      const isScopeReady = Array.from(requiredSignals).every((requiredSignal) =>
        readySignals.has(requiredSignal)
      );

      if (!isScopeReady) {
        return;
      }

      setState({
        ...state,
        readyScopes: [...state.readyScopes, scope],
      });

      maybeReleaseLoop();
    },
    publishNavigationIdentity: (identity) => {
      if (previousIdentity === null) {
        previousIdentity = identity;
        return;
      }

      if (areNavigationIdentitiesEqual(previousIdentity, identity)) {
        return;
      }

      previousIdentity = identity;
      startLoop("navigation");
    },
  };
}

function useAppReadyStore() {
  const store = useContext(AppReadyStoreContext);

  if (store === null) {
    throw new Error("AppReady hooks must be used within AppReadyProvider");
  }

  return store;
}

function useAppReadyStoreSelector<T>(selector: (state: AppReadyState) => T) {
  const store = useAppReadyStore();
  const selectorRef = useRef(selector);
  const cacheRef = useRef<{
    state: AppReadyState;
    selector: (state: AppReadyState) => T;
    value: T;
  } | null>(null);

  selectorRef.current = selector;

  const getSnapshot = useCallback(() => {
    const state = store.getSnapshot();
    const cached = cacheRef.current;
    const activeSelector = selectorRef.current;

    if (
      cached !== null &&
      Object.is(cached.state, state) &&
      Object.is(cached.selector, activeSelector)
    ) {
      return cached.value;
    }

    const nextValue = activeSelector(state);

    if (cached !== null && Object.is(cached.value, nextValue)) {
      // Keep referential stability when derived value is unchanged.
      cacheRef.current = {
        state,
        selector: activeSelector,
        value: cached.value,
      };

      return cached.value;
    }

    cacheRef.current = {
      state,
      selector: activeSelector,
      value: nextValue,
    };

    return nextValue;
  }, [store]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function AppReadyProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppReadyStore | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createAppReadyStore();
  }

  useEffect(() => {
    const store = storeRef.current;
    if (store === null) {
      return;
    }

    return () => {
      store.cleanup();
    };
  }, []);

  return (
    <AppReadyStoreContext.Provider value={storeRef.current}>
      {children}
    </AppReadyStoreContext.Provider>
  );
}

export function useAppReadyNavigationIdentityAction() {
  const store = useAppReadyStore();

  const publishNavigationIdentity = useCallback(
    (identity: AppReadyNavigationIdentity) => {
      store.publishNavigationIdentity(identity);
    },
    [store]
  );

  return useMemo(
    () => ({
      publishNavigationIdentity,
    }),
    [publishNavigationIdentity]
  );
}

export function useAppReadyUiDestination(destination: AppReadyDestination) {
  return useAppReadyStoreSelector((state) => {
    const destinationIsHiddenByLoop =
      state.hiddenDestinations.includes(destination);
    const phase = destinationIsHiddenByLoop ? state.phase : "visible";

    return {
      cycleId: state.cycleId,
      loopKind: state.loopKind,
      phase,
      hidden: phase === "hidden",
      transition: state.transition,
    };
  });
}

export function useAppReadySignalAction(signal: AppReadySignal) {
  const store = useAppReadyStore();
  const cycleIdRef = useRef<number | null>(null);

  // Freeze cycle ownership to this mounted source instance.
  if (cycleIdRef.current === null) {
    cycleIdRef.current = store.getSnapshot().cycleId;
  }

  const ready = useCallback(() => {
    store.signalReady(
      signal,
      cycleIdRef.current ?? store.getSnapshot().cycleId
    );
  }, [store, signal]);

  return useMemo(
    () => ({
      ready,
    }),
    [ready]
  );
}

export function useAppReadySignalBoolean(
  signal: AppReadySignal,
  options: {
    ready: boolean;
    skip?: boolean;
  }
) {
  const action = useAppReadySignalAction(signal);

  useEffect(() => {
    if (options.skip || !options.ready) {
      return;
    }

    action.ready();
  }, [options.skip, options.ready, action]);
}

export function useAppReadySignalOnLayoutEffect(
  signal: AppReadySignal,
  options?: { skip?: boolean }
) {
  const action = useAppReadySignalAction(signal);

  useLayoutEffect(() => {
    if (options?.skip) {
      return;
    }

    action.ready();
  }, [options?.skip, action]);
}

export function useAppReadySignalOnDoubleRafEffect(
  signal: AppReadySignal,
  options?: { skip?: boolean }
) {
  const action = useAppReadySignalAction(signal);

  useLayoutEffect(() => {
    if (options?.skip) {
      return;
    }

    let firstRafId = 0;
    let secondRafId = 0;

    firstRafId = requestAnimationFrame(() => {
      secondRafId = requestAnimationFrame(() => {
        action.ready();
      });
    });

    return () => {
      cancelAnimationFrame(firstRafId);
      cancelAnimationFrame(secondRafId);
    };
  }, [options?.skip, action]);
}
