import { useMemo } from "react";
import { globalStatsDebugger } from "@/lib/stats-debugger";
import { createReactVisibilityBindings } from "@/lib/visibility-coordinator/bindings/coordinator-react-bindings";
import { createCoordinatorSpecs } from "@/lib/visibility-coordinator/coordinator-config";
import {
  createVisibilityCoordinator,
  type InferSurfaceState,
  type InferVisibilityCoordinator,
} from "@/lib/visibility-coordinator/coordinator-core";

const specs = createCoordinatorSpecs({
  surfaces: {
    sidebar: {
      checkpoints: ["sidebar-layout"],
      initialHidden: true,
    },
    conversation: {
      checkpoints: [
        "conversation-layout",
        // "prompt-input-data"
      ],
      initialHidden: true,
      keyed: true,
    },
  },
  scenarios: {
    "initial-load": {
      surfaces: ["sidebar", "conversation"],
    },
    "nav-to-session": {
      surfaces: ["conversation"],
    },
  },
});

// Keep barrier sync derived from the same spec source.
export const appReadySurfaceIds = Object.keys(specs.surfaces) as Array<
  keyof typeof specs.surfaces
>;

export const visibilityCoordinator = createVisibilityCoordinator(specs);
export type AppReadyVisibilityCoordinator = InferVisibilityCoordinator<
  typeof specs
>;

export const reactBindings = createReactVisibilityBindings(
  visibilityCoordinator
);

const TRANSITION_PRESETS = {
  none: {
    durationMs: 0,
    easing: "linear",
  },
  fast: {
    durationMs: 100,
    easing: "var(--ease-snappy)",
  },
  normal: {
    durationMs: 300,
    easing: "var(--ease-snappy)",
  },
} as const;

type ThreadPaneVisualState = {
  hidden: boolean;
  durationMs: number;
  easing: string;
};

export function visibilityStateToTransitionState(
  raw: InferSurfaceState<typeof specs>
): ThreadPaneVisualState & InferSurfaceState<typeof specs> {
  if (raw.kind === "initial") {
    return {
      ...raw,
      ...TRANSITION_PRESETS.none,
    };
  }

  if (raw.kind === "pending") {
    return {
      ...raw,
      ...TRANSITION_PRESETS.none,
    };
  }

  if (raw.interrupted) {
    return {
      ...raw,
      ...TRANSITION_PRESETS.none,
    };
  }

  if (raw.scenario === "initial-load") {
    return {
      ...raw,
      ...TRANSITION_PRESETS.normal,
    };
  }

  if (raw.scenario === "nav-to-session") {
    // instant load
    if (raw.elapsedMs < 150) {
      return {
        ...raw,
        ...TRANSITION_PRESETS.none,
      };
    }

    // fast
    if (raw.elapsedMs < 500) {
      return {
        ...raw,
        ...TRANSITION_PRESETS.fast,
      };
    }

    // slow
    return {
      ...raw,
      ...TRANSITION_PRESETS.normal,
    };
  }

  console.warn("Missing case for app ready transition");
  return {
    ...raw,
    ...TRANSITION_PRESETS.none,
  };
}

export const {
  useReadySignal: useAppReadySignalAction,
  useReadyState: useAppReadySignalState,
} = reactBindings;

export function useAppReadyState(
  ...args: Parameters<typeof reactBindings.useSurfaceState>
) {
  const state = reactBindings.useSurfaceState(...args);
  const translatedState = useMemo(
    () => visibilityStateToTransitionState(state),
    [state]
  );
  return translatedState;
}

// debug, record elapsed type per runKey for conversation
visibilityCoordinator.subscribeRunCompletion(
  ({ elapsedMs, scenario, targetedSurfaces, runKey }) => {
    if (runKey === undefined) return;
    if (elapsedMs <= 0) return;
    if (!targetedSurfaces.includes("conversation")) return;

    const statsKey = `${scenario}:${runKey}`;
    globalStatsDebugger.addValue(statsKey, elapsedMs);
  }
);
