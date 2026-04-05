import type {
  AnyBuiltCoordinatorSpec,
  InferCheckpointId,
  InferReadySignalInput,
  InferScenarioId,
  InferScenarioNeedsRunKey,
  InferSurfaceId,
  StartRunArgs,
} from "./coordinator-config";

export type Unsubscribe = () => void;

export type Listener = () => void;

export type InitialSurfaceState = {
  kind: "initial";
  hidden: boolean;
  scenario: "initial";
};

export type PendingSurfaceState<TScenarioId extends string> = {
  kind: "pending";
  hidden: true;
  scenario: TScenarioId;
};

export type SettledSurfaceState<TScenarioId extends string> = {
  kind: "settled";
  hidden: false;
  scenario: TScenarioId;
  interrupted: boolean;
  elapsedMs: number;
};

export type SurfaceState<TScenarioId extends string> =
  | InitialSurfaceState
  | PendingSurfaceState<TScenarioId>
  | SettledSurfaceState<TScenarioId>;

export type RunCompletionEvent<
  TSurfaceId extends string,
  TScenarioId extends string,
> = {
  scenario: TScenarioId;
  runKey?: string;
  elapsedMs: number;
  targetedSurfaces: readonly TSurfaceId[];
};

export type RunCompletionListener<
  TSurfaceId extends string,
  TScenarioId extends string,
> = (event: RunCompletionEvent<TSurfaceId, TScenarioId>) => void;

export type InferSurfaceState<TSpec extends AnyBuiltCoordinatorSpec> =
  SurfaceState<InferScenarioId<TSpec>>;

export declare const ReadyHandleBrand: unique symbol;

export type ReadyHandle = {
  readonly [ReadyHandleBrand]: true;
};

const INTERNAL_READY_HANDLE = Symbol("internal-ready-handle");
type InternalReadyHandleData = {
  selectorKey: string;
  runId: number;
};

type InternalReadyHandle = ReadyHandle & {
  readonly [INTERNAL_READY_HANDLE]: InternalReadyHandleData;
};

function isInternalReadyHandle(
  handle: ReadyHandle
): handle is InternalReadyHandle {
  return (
    typeof handle === "object" &&
    handle !== null &&
    INTERNAL_READY_HANDLE in handle
  );
}

function readOpaqueHandle(
  handle: ReadyHandle
): InternalReadyHandleData | undefined {
  if (isInternalReadyHandle(handle)) {
    return handle[INTERNAL_READY_HANDLE];
  }

  return undefined;
}

function createOpaqueHandle(data: InternalReadyHandleData): ReadyHandle {
  return {
    [INTERNAL_READY_HANDLE]: data,
  } as InternalReadyHandle;
}

function isSameSurfaceState<TScenarioId extends string>(
  left: SurfaceState<TScenarioId>,
  right: SurfaceState<TScenarioId>
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.hidden !== right.hidden || left.scenario !== right.scenario) {
    return false;
  }

  if (left.kind !== "settled" || right.kind !== "settled") {
    return true;
  }

  return (
    left.interrupted === right.interrupted && left.elapsedMs === right.elapsedMs
  );
}

export interface VisibilityCoordinator<
  TSurfaceId extends string,
  TScenarioId extends string,
  TReadySignalInput,
  TScenarioNeedsRunKey extends TScenarioId,
> {
  startRun(...args: StartRunArgs<TScenarioId, TScenarioNeedsRunKey>): void;
  getSurfaceState(surface: TSurfaceId): Readonly<SurfaceState<TScenarioId>>;
  subscribeSurfaceState(surface: TSurfaceId, listener: Listener): Unsubscribe;
  subscribeRunCompletion(
    listener: RunCompletionListener<TSurfaceId, TScenarioId>
  ): Unsubscribe;
  getCurrentReadyHandle(input: TReadySignalInput): ReadyHandle | null;
  subscribeReadyHandle(
    input: TReadySignalInput,
    listener: Listener
  ): Unsubscribe;
  signalReady(handle: ReadyHandle): void;
}

export type InferVisibilityCoordinator<TSpec extends AnyBuiltCoordinatorSpec> =
  VisibilityCoordinator<
    InferSurfaceId<TSpec>,
    InferScenarioId<TSpec>,
    InferReadySignalInput<TSpec>,
    InferScenarioNeedsRunKey<TSpec>
  >;

export type SurfaceStates<TSpec extends AnyBuiltCoordinatorSpec> = Record<
  InferSurfaceId<TSpec>,
  SurfaceState<InferScenarioId<TSpec>>
>;

type ActiveRun<TSpec extends AnyBuiltCoordinatorSpec> = {
  runId: number;
  scenario: InferScenarioId<TSpec>;
  runKey?: string;
  startedAtMs: number;
  targetedSurfaces: ReadonlySet<InferSurfaceId<TSpec>>;
  awaitedReadySelectors: ReadonlySet<string>;
  acknowledgedReadySelectors: Set<string>;
};

type InternalEvent<TSpec extends AnyBuiltCoordinatorSpec> =
  | {
      type: "RUN_STARTED";
      scenario: InferScenarioId<TSpec>;
      runKey?: string;
      atMs: number;
    }
  | {
      type: "READY_SIGNALLED";
      handle: ReadyHandle;
      atMs: number;
    };

type ReduceResult<TSpec extends AnyBuiltCoordinatorSpec> = {
  nextActiveRun: ActiveRun<TSpec> | null;
  surfaceUpdates: Map<
    InferSurfaceId<TSpec>,
    SurfaceState<InferScenarioId<TSpec>>
  >;
  completedRunEvent: RunCompletionEvent<
    InferSurfaceId<TSpec>,
    InferScenarioId<TSpec>
  > | null;
  readyHandleUpdates: Map<string, ReadyHandle | null>;
};

class VisibilityCoordinatorImpl<TSpec extends AnyBuiltCoordinatorSpec>
  implements InferVisibilityCoordinator<TSpec>
{
  private readonly spec: TSpec;
  private readonly surfaceStates: SurfaceStates<TSpec>;
  private readonly surfaceListeners = new Map<
    InferSurfaceId<TSpec>,
    Set<Listener>
  >();
  private readonly runCompletionListeners = new Set<
    RunCompletionListener<InferSurfaceId<TSpec>, InferScenarioId<TSpec>>
  >();
  private readonly readyHandleListeners = new Map<string, Set<Listener>>();
  private readonly readyHandleBySelector = new Map<
    string,
    ReadyHandle | null
  >();
  private activeRun: ActiveRun<TSpec> | null = null;

  constructor(spec: TSpec) {
    this.spec = spec;
    this.surfaceStates = this.createInitialSurfaceState();
  }

  startRun = (
    ...args: StartRunArgs<
      InferScenarioId<TSpec>,
      InferScenarioNeedsRunKey<TSpec>
    >
  ): void => {
    const [scenario, options] = args;

    const result = this.reduce({
      type: "RUN_STARTED",
      scenario,
      runKey: options?.runKey,
      atMs: performance.now(),
    });

    this.commit(result);
  };

  signalReady = (handle: ReadyHandle): void => {
    const result = this.reduce({
      type: "READY_SIGNALLED",
      handle,
      atMs: performance.now(),
    });
    this.commit(result);
  };

  getSurfaceState = (
    surface: InferSurfaceId<TSpec>
  ): Readonly<SurfaceState<InferScenarioId<TSpec>>> =>
    this.getSurfaceStateOrThrow(surface);

  subscribeSurfaceState = (
    surface: InferSurfaceId<TSpec>,
    listener: Listener
  ): Unsubscribe => this.subscribe(this.surfaceListeners, surface, listener);

  subscribeRunCompletion = (
    listener: RunCompletionListener<
      InferSurfaceId<TSpec>,
      InferScenarioId<TSpec>
    >
  ): Unsubscribe => {
    this.runCompletionListeners.add(listener);

    return () => {
      this.runCompletionListeners.delete(listener);
    };
  };

  getCurrentReadyHandle = (
    input: InferReadySignalInput<TSpec>
  ): ReadyHandle | null =>
    this.readyHandleBySelector.get(this.getReadySelectorKey(input)) ?? null;

  subscribeReadyHandle = (
    input: InferReadySignalInput<TSpec>,
    listener: Listener
  ): Unsubscribe =>
    this.subscribe(
      this.readyHandleListeners,
      this.getReadySelectorKey(input),
      listener
    );

  private createInitialSurfaceState(): SurfaceStates<TSpec> {
    const surfaces = {} as SurfaceStates<TSpec>;
    const surfaceIds = Object.keys(
      this.spec.surfaces
    ) as InferSurfaceId<TSpec>[];

    for (const surfaceId of surfaceIds) {
      const surfaceSpec = this.spec.surfaces[surfaceId];

      if (surfaceSpec === undefined) {
        throw new Error(`Missing coordinator surface spec for "${surfaceId}".`);
      }

      surfaces[surfaceId] = {
        kind: "initial",
        hidden:
          surfaceSpec.initialHidden === undefined
            ? false
            : surfaceSpec.initialHidden,
        scenario: "initial",
      };
    }

    return surfaces;
  }

  private getSurfaceStateOrThrow(
    surface: InferSurfaceId<TSpec>
  ): SurfaceState<InferScenarioId<TSpec>> {
    const state = this.surfaceStates[surface];

    if (state === undefined) {
      throw new Error(`Missing coordinator state for "${surface}".`);
    }

    return state;
  }

  private _getSurfacesFromScenario(
    scenario: InferScenarioId<TSpec>
  ): readonly InferSurfaceId<TSpec>[] {
    const surfaces = this.spec.scenarios[scenario]?.surfaces;

    if (surfaces === undefined) {
      throw new Error(`Missing surfaces for scenario "${scenario}".`);
    }

    return surfaces;
  }

  private _getCheckpointsFromSurface(
    surface: InferSurfaceId<TSpec>
  ): readonly InferCheckpointId<TSpec>[] {
    const checkpoints = this.spec.surfaces[surface]?.checkpoints;

    if (checkpoints === undefined) {
      throw new Error(`Missing surfaces for scenario "${surface}".`);
    }

    return checkpoints as unknown as readonly InferCheckpointId<TSpec>[];
  }

  private _getCheckpointsFromScenario(
    scenario: InferScenarioId<TSpec>
  ): readonly InferCheckpointId<TSpec>[] {
    const surfaces = this._getSurfacesFromScenario(scenario);

    const checkpoints = surfaces.flatMap((s) =>
      this._getCheckpointsFromSurface(s)
    );

    return checkpoints;
  }

  private getNextRunId(): number {
    return (this.activeRun?.runId ?? 0) + 1;
  }

  private reduce(event: InternalEvent<TSpec>): ReduceResult<TSpec> {
    // console.log("DEBUG start transition", event);

    switch (event.type) {
      case "RUN_STARTED":
        return this.reduceRunStarted(event);
      case "READY_SIGNALLED":
        return this.reduceReadySignalled(event);
      default:
        return this.createReduceResult(this.activeRun);
    }
  }

  private reduceRunStarted(
    event: Extract<InternalEvent<TSpec>, { type: "RUN_STARTED" }>
  ): ReduceResult<TSpec> {
    const prevRun = this.activeRun;

    // Starting the exact same active run again is a no-op.
    if (this.isSameActiveRun(prevRun, event)) {
      return this.createReduceResult(prevRun);
    }

    const nextRun = this.createRun(event);
    const interruptedSurfaceIds = this.getInterruptedSurfaceIds(
      prevRun,
      nextRun
    );
    const surfaceUpdates = new Map<
      InferSurfaceId<TSpec>,
      SurfaceState<InferScenarioId<TSpec>>
    >();
    const readyHandleUpdates = new Map<string, ReadyHandle | null>();
    const updatedSurfaceIds = new Set<InferSurfaceId<TSpec>>([
      ...nextRun.targetedSurfaces,
      ...interruptedSurfaceIds,
    ]);
    const selectorKeys = new Set<string>([
      ...(prevRun?.awaitedReadySelectors ?? []),
      ...nextRun.awaitedReadySelectors,
    ]);

    for (const surfaceId of updatedSurfaceIds) {
      const nextState = nextRun.targetedSurfaces.has(surfaceId)
        ? this.createHiddenSurfaceState(nextRun)
        : this.createInterruptedSurfaceState(nextRun);

      if (
        !isSameSurfaceState(this.getSurfaceStateOrThrow(surfaceId), nextState)
      ) {
        surfaceUpdates.set(surfaceId, nextState);
      }
    }

    for (const selectorKey of selectorKeys) {
      const nextHandle = nextRun.awaitedReadySelectors.has(selectorKey)
        ? createOpaqueHandle({
            selectorKey,
            runId: nextRun.runId,
          })
        : null;

      if (
        (this.readyHandleBySelector.get(selectorKey) ?? null) !== nextHandle
      ) {
        readyHandleUpdates.set(selectorKey, nextHandle);
      }
    }

    return {
      nextActiveRun: nextRun,
      surfaceUpdates,
      completedRunEvent: null,
      readyHandleUpdates,
    };
  }

  private isSameActiveRun(
    run: ActiveRun<TSpec> | null,
    event: Extract<InternalEvent<TSpec>, { type: "RUN_STARTED" }>
  ): boolean {
    if (run == null) {
      return false;
    }

    return run.scenario === event.scenario && run.runKey === event.runKey;
  }

  private reduceReadySignalled(
    event: Extract<InternalEvent<TSpec>, { type: "READY_SIGNALLED" }>
  ): ReduceResult<TSpec> {
    const activeRun = this.activeRun;
    const handleData = readOpaqueHandle(event.handle);

    if (activeRun == null || handleData === undefined) {
      return this.createReduceResult(activeRun);
    }

    const currentHandle =
      this.readyHandleBySelector.get(handleData.selectorKey) ?? null;

    if (currentHandle !== event.handle) {
      return this.createReduceResult(activeRun);
    }

    if (handleData.runId !== activeRun.runId) {
      return this.createReduceResult(activeRun);
    }

    if (!activeRun.awaitedReadySelectors.has(handleData.selectorKey)) {
      return this.createReduceResult(activeRun);
    }

    const acknowledgedReadySelectors = new Set(
      activeRun.acknowledgedReadySelectors
    );
    acknowledgedReadySelectors.add(handleData.selectorKey);

    if (
      acknowledgedReadySelectors.size < activeRun.awaitedReadySelectors.size
    ) {
      return {
        nextActiveRun: {
          ...activeRun,
          acknowledgedReadySelectors,
        },
        surfaceUpdates: new Map(),
        completedRunEvent: null,
        readyHandleUpdates: new Map(),
      };
    }

    const elapsedMs = Math.max(0, event.atMs - activeRun.startedAtMs);
    const surfaceUpdates = new Map<
      InferSurfaceId<TSpec>,
      SurfaceState<InferScenarioId<TSpec>>
    >();

    const readyHandleUpdates = new Map<string, ReadyHandle | null>();

    for (const surfaceId of activeRun.targetedSurfaces) {
      const currentState = this.getSurfaceStateOrThrow(surfaceId);
      const nextState: SurfaceState<InferScenarioId<TSpec>> = {
        kind: "settled",
        hidden: false,
        scenario: activeRun.scenario,
        interrupted:
          currentState.kind === "settled" ? currentState.interrupted : false,
        elapsedMs,
      };

      if (!isSameSurfaceState(currentState, nextState)) {
        surfaceUpdates.set(surfaceId, nextState);
      }
    }

    for (const selectorKey of activeRun.awaitedReadySelectors) {
      if ((this.readyHandleBySelector.get(selectorKey) ?? null) !== null) {
        readyHandleUpdates.set(selectorKey, null);
      }
    }

    return {
      nextActiveRun: null,
      surfaceUpdates,
      completedRunEvent: {
        scenario: activeRun.scenario,
        runKey: activeRun.runKey,
        elapsedMs,
        targetedSurfaces: [...activeRun.targetedSurfaces],
      },
      readyHandleUpdates,
    };
  }

  private createRun(
    event: Extract<InternalEvent<TSpec>, { type: "RUN_STARTED" }>
  ): ActiveRun<TSpec> {
    return {
      runId: this.getNextRunId(),
      scenario: event.scenario,
      runKey: event.runKey,
      startedAtMs: event.atMs,
      targetedSurfaces: new Set(this._getSurfacesFromScenario(event.scenario)),
      awaitedReadySelectors: new Set(
        this._getCheckpointsFromScenario(event.scenario).map((checkpoint) =>
          this._getReadySelectorKeyFromCheckpoint(checkpoint, event.runKey)
        )
      ),
      acknowledgedReadySelectors: new Set(),
    };
  }

  private getInterruptedSurfaceIds(
    prevRun: ActiveRun<TSpec> | null,
    nextRun: ActiveRun<TSpec>
  ): Set<InferSurfaceId<TSpec>> {
    if (prevRun === null || !this.isRunPending(prevRun)) {
      return new Set();
    }

    const interruptedSurfaceIds = new Set<InferSurfaceId<TSpec>>();

    for (const surfaceId of prevRun.targetedSurfaces) {
      if (!nextRun.targetedSurfaces.has(surfaceId)) {
        interruptedSurfaceIds.add(surfaceId);
      }
    }

    return interruptedSurfaceIds;
  }

  private createHiddenSurfaceState(
    activeRun: ActiveRun<TSpec>
  ): SurfaceState<InferScenarioId<TSpec>> {
    return {
      kind: "pending",
      hidden: true,
      scenario: activeRun.scenario,
    };
  }

  private createInterruptedSurfaceState(
    activeRun: ActiveRun<TSpec>
  ): SurfaceState<InferScenarioId<TSpec>> {
    return {
      kind: "settled",
      hidden: false,
      scenario: activeRun.scenario,
      interrupted: true,
      elapsedMs: 0,
    };
  }

  private createReduceResult(
    nextActiveRun: ActiveRun<TSpec> | null
  ): ReduceResult<TSpec> {
    return {
      nextActiveRun,
      surfaceUpdates: new Map(),
      completedRunEvent: null,
      readyHandleUpdates: new Map(),
    };
  }

  private commit(result: ReduceResult<TSpec>): void {
    this.activeRun = result.nextActiveRun;

    for (const [surfaceId, nextState] of result.surfaceUpdates) {
      this.surfaceStates[surfaceId] = nextState;
    }

    for (const [selectorKey, nextHandle] of result.readyHandleUpdates) {
      this.readyHandleBySelector.set(selectorKey, nextHandle);
    }

    this.notifySurfaceListeners(result.surfaceUpdates.keys());
    this.notifyReadyHandleListeners(result.readyHandleUpdates.keys());

    if (result.completedRunEvent !== null) {
      this.notifyRunCompletionListeners(result.completedRunEvent);
    }
  }

  private notifySurfaceListeners(
    surfaceIds: Iterable<InferSurfaceId<TSpec>>
  ): void {
    for (const surfaceId of surfaceIds) {
      // console.log("DEBUG STATE UPDATE", {
      //   surfaceId,
      //   state: this._getSurfaceState(surfaceId),
      // });
      this.emit(this.surfaceListeners, surfaceId);
    }
  }

  private notifyReadyHandleListeners(selectorKeys: Iterable<string>): void {
    for (const selectorKey of selectorKeys) {
      // console.log("DEBUG HANDLER UPDATE", {
      //   selectorKey,
      //   handler: this.readyHandleBySelector.get(selectorKey),
      // });
      this.emit(this.readyHandleListeners, selectorKey);
    }
  }

  private notifyRunCompletionListeners(
    event: RunCompletionEvent<InferSurfaceId<TSpec>, InferScenarioId<TSpec>>
  ): void {
    for (const listener of this.runCompletionListeners) {
      listener(event);
    }
  }

  private emit<TKey>(registry: Map<TKey, Set<Listener>>, key: TKey): void {
    const listeners = registry.get(key);

    if (listeners == null) {
      return;
    }

    for (const listener of listeners) {
      listener();
    }
  }

  private _getSurfaceFromCheckpoint(
    checkpoint: InferCheckpointId<TSpec>
  ): InferSurfaceId<TSpec> {
    const surfaceIds = Object.keys(
      this.spec.surfaces
    ) as InferSurfaceId<TSpec>[];

    for (const surfaceId of surfaceIds) {
      if (this._getCheckpointsFromSurface(surfaceId).includes(checkpoint)) {
        return surfaceId;
      }
    }

    throw new Error(`Missing surface for checkpoint "${checkpoint}".`);
  }

  private _getReadySelectorKeyFromCheckpoint(
    checkpoint: InferCheckpointId<TSpec>,
    runKey?: string
  ): string {
    const surface = this._getSurfaceFromCheckpoint(checkpoint);
    const isKeyed = this.spec.surfaces[surface]?.keyed === true;

    if (!isKeyed) {
      return this.serializeReadySelector(checkpoint);
    }

    if (runKey === undefined) {
      throw new Error(`Missing runKey for keyed checkpoint "${checkpoint}".`);
    }

    return this.serializeReadySelector(checkpoint, runKey);
  }

  private isRunPending(run: ActiveRun<TSpec> | null): boolean {
    return (
      run !== null &&
      run.acknowledgedReadySelectors.size < run.awaitedReadySelectors.size
    );
  }

  private subscribe<TKey>(
    registry: Map<TKey, Set<Listener>>,
    key: TKey,
    listener: Listener
  ): Unsubscribe {
    let listeners = registry.get(key);

    if (listeners == null) {
      listeners = new Set<Listener>();
      registry.set(key, listeners);
    }

    listeners.add(listener);

    return () => {
      const currentListeners = registry.get(key);

      if (currentListeners == null) {
        return;
      }

      currentListeners.delete(listener);

      if (currentListeners.size === 0) {
        registry.delete(key);
      }
    };
  }

  private getReadySelectorKey(input: InferReadySignalInput<TSpec>): string {
    return this.serializeReadySelector(
      input.checkpoint,
      "runKey" in input ? input.runKey : undefined
    );
  }

  private serializeReadySelector(checkpoint: string, runKey?: string): string {
    return JSON.stringify([checkpoint, runKey ?? null]);
  }
}

export function createVisibilityCoordinator<
  const TSpec extends AnyBuiltCoordinatorSpec,
>(spec: TSpec): InferVisibilityCoordinator<TSpec> {
  return new VisibilityCoordinatorImpl(spec);
}
