import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { ReadyHandle, VisibilityCoordinator } from "../coordinator-core";

type ReadyInputLike = {
  checkpoint: string;
  runKey?: string;
};

type ReadySignalResult = {
  markReady: () => void;
};

type ReadyStateInput<TReadySignalInput extends ReadyInputLike> =
  TReadySignalInput & {
    isReady: boolean;
  };

export type ReactVisibilityBindings<
  TSurfaceId extends string,
  TSurfaceState,
  TReadySignalInput extends ReadyInputLike,
> = {
  useSurfaceState(surface: TSurfaceId): TSurfaceState;
  useReadySignal(input: TReadySignalInput): ReadySignalResult;
  useReadyState(input: ReadyStateInput<TReadySignalInput>): void;
};

export type InferReactVisibilityBindings<TCoordinator> =
  TCoordinator extends VisibilityCoordinator<
    infer TSurfaceId,
    infer _TScenarioId,
    infer TReadySignalInput,
    infer _TScenarioNeedsRunKey
  >
    ? TSurfaceId extends string
      ? TReadySignalInput extends ReadyInputLike
        ? ReactVisibilityBindings<
            TSurfaceId,
            ReturnType<TCoordinator["getSurfaceState"]>,
            TReadySignalInput
          >
        : never
      : never
    : never;

const NOOP = (): void => undefined;

export function createReactVisibilityBindings<
  TSurfaceId extends string,
  TScenarioId extends string,
  TReadySignalInput extends ReadyInputLike,
  TScenarioNeedsRunKey extends TScenarioId,
>(
  coordinator: VisibilityCoordinator<
    TSurfaceId,
    TScenarioId,
    TReadySignalInput,
    TScenarioNeedsRunKey
  >
): ReactVisibilityBindings<
  TSurfaceId,
  ReturnType<
    VisibilityCoordinator<
      TSurfaceId,
      TScenarioId,
      TReadySignalInput,
      TScenarioNeedsRunKey
    >["getSurfaceState"]
  >,
  TReadySignalInput
> {
  function useSurfaceState(
    surface: TSurfaceId
  ): ReturnType<typeof coordinator.getSurfaceState> {
    const subscribe = useCallback(
      (onStoreChange: () => void) =>
        coordinator.subscribeSurfaceState(surface, onStoreChange),
      [coordinator, surface]
    );

    const getSnapshot = useCallback(
      () => coordinator.getSurfaceState(surface),
      [coordinator, surface]
    );

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }

  function useReadySignal(input: TReadySignalInput): ReadySignalResult {
    // Stabilize ref so we avoid rerenders when called without memoized params.
    const readyInput = useMemo(() => {
      if (input.runKey === undefined) {
        return { checkpoint: input.checkpoint } as TReadySignalInput;
      }

      return {
        checkpoint: input.checkpoint,
        runKey: input.runKey,
      } as TReadySignalInput;
    }, [input.checkpoint, input.runKey]) satisfies TReadySignalInput;

    const readHandle = useCallback(
      () => coordinator.getCurrentReadyHandle(readyInput),
      [coordinator, readyInput]
    );

    const subscribeHandle = useCallback(
      (listener: () => void) =>
        coordinator.subscribeReadyHandle(readyInput, listener),
      [coordinator, readyInput]
    );

    const [handle, setHandle] = useState<ReadyHandle | null>(() =>
      readHandle()
    );

    useEffect(() => {
      const syncHandle = () => {
        setHandle(readHandle());
      };

      syncHandle();

      return subscribeHandle(syncHandle);
    }, [readHandle, subscribeHandle]);

    const markReady = useMemo(() => {
      if (handle == null) {
        return NOOP;
      }

      return () => {
        coordinator.signalReady(handle);
      };
    }, [coordinator, handle]);

    return { markReady };
  }

  function useReadyState(input: ReadyStateInput<TReadySignalInput>): void {
    const { isReady } = input;
    const { markReady } = useReadySignal(input);

    useEffect(() => {
      if (isReady) {
        markReady();
      }
    }, [isReady, markReady]);
  }

  return {
    useSurfaceState,
    useReadySignal,
    useReadyState,
  };
}
