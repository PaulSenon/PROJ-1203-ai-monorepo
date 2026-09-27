# UI Visibility Coordinator — Final Spec

This document is the single source of truth for the current design.
It supersedes the earlier addendums and resolves prior contradictions.

---

## 1. Goal

Build a small, framework-agnostic visibility coordinator that:

- coordinates visual reveal/hide flows across UI surfaces
- supports multiple scenarios (for example app boot and thread switch)
- is fully typed and inferred from a config
- is safe against race conditions
- works even when components stay mounted and are only hidden/shown
- keeps the core runtime in plain TypeScript
- provides React bindings as a separate layer
- keeps the public app-facing API small and readable

This system is only about **UI visibility coordination**.
It is **not** a data-fetching manager, router, animation engine, or general workflow engine.

---

## 2. Core constraints / requirements

### Functional requirements

The system must support:

1. a first boot scenario that can wait for multiple UI areas before reveal
2. subsequent navigation scenarios that can preempt previous ones
3. multiple fast A -> B -> A -> B navigations without race-condition bugs
4. components that do **not** remount between cycles
5. ready callbacks that may fire asynchronously later
6. stale ready callbacks being safely ignored
7. typed config -> typed runtime APIs -> typed React bindings

### Behavioral requirements

- only one run may be active at a time
- last run wins
- any new run fully preempts the previous one
- old late events must be ignored
- targeted surfaces must start hidden for a run
- non-targeted surfaces must be forced visible for a run
- reveal happens only when all awaited ready signals for the run have been acknowledged
- no timeout-based fail-open in v1
- no global animation-settled tracking in the core
- no React in the core runtime

### Performance requirements

- `useSurfaceState(surface)` must rerender only when that specific surface changes
- ready signaling must not force rerenders of heavy components for unrelated ticket changes
- the imperative ready callback must not become unsafe against old async callbacks
- subscriptions must be fine-grained

---

## 3. Glossary

### Coordinator
Plain TypeScript runtime instance that owns:
- current state
- internal reducer/state machine
- subscriptions
- ready-handle lifecycle

### Scenario
Declarative recipe that targets one or more surfaces.

Examples:
- `appBoot`
- `threadSwitch`

### Run
Concrete execution of a scenario.

A new run:
- preempts the previous run
- reseeds all surface states
- issues new ready handles for the selectors it expects

### Surface
A UI area whose visibility is coordinated.

Examples:
- `sidebar`
- `threadPane`

### Checkpoint
A named readiness signal emitted by UI code.

Examples:
- `sidebarReady`
- `activeThreadReady`

### Ready selector
Internal normalized selector used by the core to identify “which ready signal for which key”.

Examples:
- `sidebarReady`
- `activeThreadReady::thread-123`

This is **internal only**. The app never constructs it manually.

### Ready handle
Opaque core-issued token representing the **current ready ticket** for one ready selector.

A handle is:
- created by the core
- validated by the core
- ignored by the core if stale

### Run key
Structured app-facing value used when a surface/checkpoint/scenario is keyed.

Example:
- `threadId` for `threadPane` / `activeThreadReady`

### Raw surface state
Minimal state produced by the coordinator for a surface:

- `hidden`
- `scenario`
- `interrupted`
- `elapsedMs`

### App-level projection
Pure app-specific mapping from raw surface state to richer visual/business state.

This is not part of the core runtime.

---

## 4. High-level architecture

The system is split into four layers:

1. `defineVisibilitySpec(...)`
2. `createVisibilityCoordinator(spec)`
3. `createReactVisibilityBindings(coordinator)`
4. app-level projection from raw surface state to visual/business state

### Layer 1 — `defineVisibilitySpec(...)`
Role:
- freeze config
- infer literal types
- validate references

### Layer 2 — `createVisibilityCoordinator(spec)`
Role:
- create the plain TS runtime
- own state, reducer, subscriptions, ready handles

### Layer 3 — `createReactVisibilityBindings(coordinator)`
Role:
- adapt the coordinator to React hooks

### Layer 4 — app-level projection
Role:
- map generic raw state to the app’s real UI state

---

## 5. Config shape

## 5.1 Final config shape

```ts
type VisibilitySpec = {
  surfaces: Record<
    string,
    {
      keyed?: true
      initialHidden?: boolean
      checkpoints: readonly string[]
    }
  >
  scenarios: Record<
    string,
    {
      surfaces: readonly string[]
    }
  >
}
```

### Surface fields

- `keyed?: true`
  - optional
  - means this surface/checkpoints are scoped by a `runKey`

- `initialHidden?: boolean`
  - optional
  - default = `false`
  - applies before any run starts

- `checkpoints`
  - list of readiness checkpoints owned by the surface

### Scenario fields

- `surfaces`
  - list of targeted surfaces

No `waitsFor` in the config.
Checkpoint expectations are derived from the targeted surfaces.

## 5.2 Config invariants

These are authoring-time invariants of the config shape.

- a scenario must target at least one surface
- a surface must declare at least one checkpoint

Preferred enforcement strategy:

- enforce through TypeScript config types
- no extra runtime validation is required in the config helper
- the config helper should stay minimal and mostly identity/inference-oriented

## 5.3 Example config

```ts
const spec = defineVisibilitySpec({
  surfaces: {
    sidebar: {
      initialHidden: true,
      checkpoints: ["sidebarReady"],
    },

    threadPane: {
      keyed: true,
      initialHidden: true,
      checkpoints: ["activeThreadReady"],
    },
  },

  scenarios: {
    appBoot: {
      surfaces: ["sidebar", "threadPane"],
    },

    threadSwitch: {
      surfaces: ["threadPane"],
    },
  },
} as const)
```

---

## 6. Config-derived typing goals

All public runtime APIs and React bindings should be inferred from the spec.

Expected derived utility types include:

```ts
type SurfaceIdFromSpec<TSpec> = ...
type ScenarioIdFromSpec<TSpec> = ...
type CheckpointIdFromSpec<TSpec> = ...
type ReadySignalInputFromSpec<TSpec> = ...
type StartRunArgsFromSpec<TSpec> = ...
type ScenarioNeedsRunKeyFromSpec<TSpec> = ...
```

### `ReadySignalInputFromSpec<TSpec>` direction

For the example spec above:

```ts
type ReadySignalInput =
  | { checkpoint: "sidebarReady" }
  | { checkpoint: "activeThreadReady"; runKey: string }
```

### `StartRunArgsFromSpec<TSpec>` direction

For the example spec above:

```ts
startRun("appBoot", { runKey: string })
startRun("threadSwitch", { runKey: string })
```

Reason:
- `threadPane` is keyed
- both scenarios target `threadPane`
- therefore both scenarios require a `runKey`

---

## 7. Core runtime public interface

```ts
type Unsubscribe = () => void
type Listener = () => void

type SurfaceState<ScenarioId extends string> = {
  hidden: boolean
  scenario: "initial" | ScenarioId
  interrupted: boolean
  elapsedMs: number
}

declare const ReadyHandleBrand: unique symbol

type ReadyHandle = {
  readonly [ReadyHandleBrand]: true
}

type StartRunArgs<
  ScenarioId extends string,
  ScenarioNeedsKey extends ScenarioId,
> =
  | {
      [S in Exclude<ScenarioId, ScenarioNeedsKey>]: [scenario: S]
    }[Exclude<ScenarioId, ScenarioNeedsKey>]
  | {
      [S in ScenarioNeedsKey]: [scenario: S, args: { runKey: string }]
    }[ScenarioNeedsKey]

interface VisibilityCoordinator<
  SurfaceId extends string,
  ScenarioId extends string,
  ReadySignalInput,
  ScenarioNeedsKey extends ScenarioId,
> {
  /**
   * Starts a run. Fully preempts any active run.
   */
  startRun(...args: StartRunArgs<ScenarioId, ScenarioNeedsKey>): void

  /**
   * Reads the current raw state for one surface.
   */
  getSurfaceState(surface: SurfaceId): SurfaceState<ScenarioId>

  /**
   * Subscribes to changes of exactly one surface state.
   */
  subscribeSurfaceState(
    surface: SurfaceId,
    listener: Listener
  ): Unsubscribe

  /**
   * Returns the current opaque ready handle for one structured ready input,
   * or null if no ready is currently awaited for that input.
   */
  getCurrentReadyHandle(
    input: ReadySignalInput
  ): ReadyHandle | null

  /**
   * Subscribes to ready-handle identity changes relevant to one structured ready input.
   * Used by ready bindings, not for visible state.
   */
  subscribeReadyHandle(
    input: ReadySignalInput,
    listener: Listener
  ): Unsubscribe

  /**
   * Signals readiness for the specific opaque handle.
   * Stale handles are ignored safely.
   */
  signalReady(handle: ReadyHandle): void
}
```

### Why there are two subscription channels

#### `subscribeSurfaceState(...)`
Used for:
- `useSurfaceState(surface)`

Needs rerender on surface state change.

#### `subscribeReadyHandle(...)`
Used for:
- `useReadySignal(input)`

Needs to wake ready logic for one selector without forcing broad rerenders.

The listener must fire whenever `getCurrentReadyHandle(input)` would change, including:

- `null -> handle`
- `handle A -> handle B`
- `handle -> null`

---

## 8. React bindings public interface

Bindings are created separately from the core:

```ts
const coordinator = createVisibilityCoordinator(spec)
const react = createReactVisibilityBindings(coordinator)
```

No Provider is required by default in v1.

```ts
interface ReactVisibilityBindings<
  SurfaceId extends string,
  ScenarioId extends string,
  ReadySignalInput,
> {
  useSurfaceState(surface: SurfaceId): SurfaceState<ScenarioId>

  useReadySignal(input: ReadySignalInput): {
    markReady: () => void
  }

  useReadyState(
    input: ReadySignalInput & {
      isReady: boolean
    }
  ): void
}
```

### Hook roles

#### `useSurfaceState(surface)`
- uses `useSyncExternalStore`
- rerenders only when that surface changes

#### `useReadySignal(input)`
- lower-level primitive
- returns a `markReady` callback bound to the current ready handle
- does **not** use `useSyncExternalStore` for its main ticket logic
- should avoid rerendering heavy components on unrelated ready changes

#### `useReadyState(input + isReady)`
- built on top of `useReadySignal(...)`
- declarative bridge from a boolean local readiness signal

---

## 9. App-level projection layer

The app should keep its transition/motion logic outside the core.

Example direction:

```ts
type ThreadPaneVisualState = {
  hidden: boolean
  durationMs: number
  easing: string
  interrupted: boolean
}

function projectThreadPaneVisualState(
  raw: SurfaceState<"appBoot" | "threadSwitch">
): ThreadPaneVisualState {
  if (raw.hidden) {
    return {
      hidden: true,
      durationMs: 0,
      easing: "linear",
      interrupted: raw.interrupted,
    }
  }

  if (raw.elapsedMs < 100) {
    return {
      hidden: false,
      durationMs: 0,
      easing: "linear",
      interrupted: raw.interrupted,
    }
  }

  return {
    hidden: false,
    durationMs: raw.interrupted ? 0 : 180,
    easing: "ease-out",
    interrupted: raw.interrupted,
  }
}
```

Optional later:
- wrap these projection functions into app-level hooks

---

## 10. Behavioral rules

## 10.1 Single active run
Only one run may be active at a time.

## 10.2 Total preemption
Starting a new run immediately replaces the previous run.

## 10.3 Surface baseline on run start
When a run starts:
- targeted surfaces become `hidden: true`
- non-targeted surfaces become `hidden: false`

This applies to **all surfaces**, every time.

## 10.4 Reveal condition
A run reveals its targeted surfaces only when **all awaited ready selectors** have been acknowledged for the current run.

## 10.5 No auto boot scenario
The coordinator does **not** auto-start `appBoot`.

Reason:
- it does not know the `runKey`
- explicit app-level orchestration is clearer
- initial UI state is handled by `initialHidden`

## 10.6 Initial state
Before the first run:
- each surface uses its `initialHidden` value
- `scenario = "initial"`
- `interrupted = false`
- `elapsedMs = 0`

---

## 11. Public raw surface state semantics

```ts
type SurfaceState<ScenarioId extends string> = {
  hidden: boolean
  scenario: "initial" | ScenarioId
  interrupted: boolean
  elapsedMs: number
}
```

Meaning:

- `hidden`
  - current raw visibility state of the surface

- `scenario`
  - `"initial"` before any run
  - otherwise the scenario that produced the current state

- `interrupted`
  - per-surface interruption marker bound to the current run snapshot
  - `true` only when a new run preempted a previous unresolved run and this surface belonged to the interrupted previous run but is not covered by the new run
  - `false` otherwise

- `elapsedMs`
  - final duration of the completed run that produced the reveal
  - **not** a live clock

### `elapsedMs` rules

- before first run: `0`
- on run start: updated surfaces get `0`
- when the run completes and reveals targeted surfaces:
  - targeted surfaces receive:
  - `elapsedMs = readyAtMs - activeRun.startedAtMs`

So `elapsedMs` is a final duration snapshot, not a continuously updating timer.

### `interrupted` rules

- default = `false`
- before first run: `false`
- starting a new run only produces interrupted surfaces if the previous run was still unresolved
- interruption is evaluated per surface, not globally
- if the new run covers the same surface, that surface is **not** flagged interrupted
- if the new run drops a surface that belonged to the unresolved previous run, that dropped surface becomes `interrupted: true`

Example:

- `appBoot` targets `sidebar + threadPane`
- before `appBoot` resolves, `threadSwitch` starts and targets only `threadPane`
- `sidebar` must receive a new state with:
  - `hidden: false`
  - `scenario: "threadSwitch"`
  - `interrupted: true`
- `threadPane` is not flagged interrupted because it is still covered by the new run

Example:

- unresolved `threadSwitch(A)` is preempted by `threadSwitch(B)`
- both runs cover only `threadPane`
- no surface is flagged interrupted

---

## 12. Ready semantics

## 12.1 No global sticky `ready: boolean`
The system must **not** model readiness as one persistent boolean per component.

Instead:

- readiness means:
  - the **current ready handle** for a selector has been acknowledged
  - or it has not

When a new run emits a new ready handle for the same selector:
- previous readiness no longer counts
- no explicit boolean reset is required
- reset is implicit in the new handle

## 12.2 Ready selector normalization is internal only

Internal normalized selector rule:

```ts
normalizedSelector =
  runKey == null
    ? checkpoint
    : `${checkpoint}::${runKey}`
```

Examples:
- `sidebarReady`
- `activeThreadReady::thread-A`

This is internal only.
The app never constructs these strings manually.

## 12.3 Ready handle is opaque
A `ReadyHandle` is a core-issued opaque token.

It is **not**:
- a public string
- a public concatenation of `checkpoint + runKey`
- something app code creates itself

The core:
- creates it
- validates it
- ignores it if stale

## 12.4 `markReady` is stable per handle, not for component lifetime
Important rule:

- `markReady` must be stable for the **current handle**
- when the relevant handle changes, a new `markReady` is produced
- older callback references become stale
- late calls to old callbacks are safely ignored by the core

This is necessary to correctly handle:
- async late callbacks
- A -> B -> A races
- persistent hidden activities

---

## 13. Why the handle-bound callback is necessary

If `markReady` were stable for the whole component lifetime and simply used “whatever the current ticket is now”, a late async callback from an old cycle could accidentally acknowledge a newer cycle.

That is unsafe.

Therefore:
- old callback references must stay tied to old handles
- new runs must issue new handles
- the core must ignore stale handles

This is the chosen compromise.

---

## 14. Internal coordinator shape (conceptual)

## 14.1 Active run

```ts
type ActiveRun<SurfaceId extends string, ScenarioId extends string> = {
  runId: number
  scenario: ScenarioId
  runKey?: string
  startedAtMs: number
  targetedSurfaces: ReadonlySet<SurfaceId>
  awaitedReadySelectors: ReadonlySet<string>
  acknowledgedReadySelectors: ReadonlySet<string>
}
```

## 14.2 Internal ready handle registry

```ts
type InternalReadyHandle = {
  id: number
  selector: string
  runId: number
}

type ReadyRegistry = Map<
  string,
  {
    version: number
    currentHandle: InternalReadyHandle | null
  }
>
```

Purpose:
- identify the current handle for a selector
- invalidate previous readiness automatically
- notify ready subscribers when a selector gets a new handle

## 14.3 Internal state (conceptual)

```ts
type InternalState<SurfaceId extends string, ScenarioId extends string> = {
  nextRunId: number
  nextReadyHandleId: number
  activeRun: ActiveRun<SurfaceId, ScenarioId> | null
  surfaces: Record<SurfaceId, SurfaceState<ScenarioId>>
  readyRegistry: ReadyRegistry
}
```

---

## 15. Internal reducer events

Conceptual internal events:

```ts
type InternalEvent<ScenarioId extends string> =
  | {
      type: "RUN_STARTED"
      scenario: ScenarioId
      runKey?: string
      atMs: number
    }
  | {
      type: "READY_SIGNALLED"
      handle: ReadyHandle
      atMs: number
    }
```

These are internal runtime events.
They are not app-level reducers or UI-level reducers.

---

## 16. Internal reducer behavior

## 16.1 On `RUN_STARTED`

The reducer must:

1. resolve targeted surfaces for the scenario
2. collect checkpoints owned by those targeted surfaces, then normalize them into awaited ready selectors for the current run
3. create a new active run
4. reseed all surfaces:
   - targeted -> `hidden: true`
   - non-targeted -> `hidden: false`
   - `scenario = current scenario`
   - `interrupted` is computed per surface:
     - `true` only if the previous run existed, was still unresolved, the surface belonged to that previous run, and the new run does not cover it
     - `false` otherwise
   - `elapsedMs = 0`
5. issue a fresh ready handle for every awaited ready selector
6. notify:
   - changed surfaces
   - changed ready selectors

## 16.2 On `READY_SIGNALLED(handle)`

The reducer must:

1. validate that the handle is still the current handle for its selector
2. ignore if stale
3. mark the selector as acknowledged for the current run
4. if all awaited selectors are acknowledged:
   - reveal targeted surfaces:
      - `hidden = false`
      - `scenario = activeRun.scenario`
      - `interrupted` stays whatever value was assigned for that surface when the run started
      - `elapsedMs = atMs - activeRun.startedAtMs`
5. notify changed surfaces

---

## 17. React binding behavior

## 17.1 `useSurfaceState(surface)`

Should use `useSyncExternalStore` with:
- `subscribeSurfaceState(surface, listener)`
- `getSurfaceState(surface)`

Guarantee:
- rerender only when that surface changes

## 17.2 `useReadySignal(input)`

This hook must remain thin and should not own ticket logic.

It must:

1. ask the core for the current handle:
   - `coordinator.getCurrentReadyHandle(input)`
2. subscribe to ready-handle changes for the same structured input:
   - `coordinator.subscribeReadyHandle(input, listener)`
3. expose a `markReady` callback bound to the current handle
4. regenerate that callback only when the relevant handle changes

Important:
- the binding does **not** invent ticket semantics
- the binding does **not** build selector strings manually
- the binding does **not** validate staleness
- the core does all of that

## 17.3 `useReadyState(input + isReady)`

Should be layered on top of `useReadySignal(input)`.

Concept:
- get `markReady`
- when local `isReady` becomes true, call `markReady()`

---

## 18. Clarification about refs / effects / no rerender

A subscription callback does **not** need a React rerender in order to function.

Correct mechanism:

- the hook installs an imperative subscription
- the coordinator notifies that subscription when the relevant ready selector changes
- the subscription callback can read/write refs directly
- the subscription callback can call back into the coordinator directly

So:
- correctness does not depend on remounting
- correctness does not depend on broad rerenders of heavy components
- this is why ready signaling is not modeled as a `useSyncExternalStore` value consumer

The only reason a new `markReady` must exist is to bind it to a **new handle**, not because the hook needs generic rerender-based freshness.

---

## 19. App-level bridge example

Example bridge that starts `appBoot` once, then `threadSwitch` whenever the active thread id changes:

```tsx
function VisibilityRunBridge() {
  const { currentThreadId } = useNav()
  const hasBootedRef = useRef(false)
  const previousThreadIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!hasBootedRef.current) {
      hasBootedRef.current = true
      previousThreadIdRef.current = currentThreadId

      coordinator.startRun("appBoot", {
        runKey: currentThreadId,
      })
      return
    }

    if (previousThreadIdRef.current === currentThreadId) return

    previousThreadIdRef.current = currentThreadId

    coordinator.startRun("threadSwitch", {
        runKey: currentThreadId,
    })
  }, [currentThreadId])

  return null
}
```

---

## 20. Usage examples

## 20.1 Build the system

```ts
const spec = defineVisibilitySpec({
  surfaces: {
    sidebar: {
      initialHidden: true,
      checkpoints: ["sidebarReady"],
    },
    threadPane: {
      keyed: true,
      initialHidden: true,
      checkpoints: ["activeThreadReady"],
    },
  },
  scenarios: {
    appBoot: {
      surfaces: ["sidebar", "threadPane"],
    },
    threadSwitch: {
      surfaces: ["threadPane"],
    },
  },
} as const)

const coordinator = createVisibilityCoordinator(spec)
const react = createReactVisibilityBindings(coordinator)
```

## 20.2 Surface consumption

```ts
function useThreadPaneVisualState() {
  const raw = react.useSurfaceState("threadPane")
  return projectThreadPaneVisualState(raw)
}
```

## 20.3 Imperative ready usage

```tsx
function ThreadReadyEmitter({ threadId }: { threadId: string }) {
  const { markReady } = react.useReadySignal({
    checkpoint: "activeThreadReady",
    runKey: threadId,
  })

  return (
    <VirtualizedThreadView
      threadId={threadId}
      onReady={markReady}
    />
  )
}
```

## 20.4 Declarative ready usage

```tsx
function ThreadReadyBridge({ threadId }: { threadId: string }) {
  const messagesReady = useMessagesHydrated(threadId)
  const layoutReady = useThreadLayoutStable(threadId)
  const editorReady = useComposerReady(threadId)

  const isReady = messagesReady && layoutReady && editorReady

  react.useReadyState({
    checkpoint: "activeThreadReady",
    runKey: threadId,
    isReady,
  })

  return null
}
```

## 20.5 Sidebar ready usage

```tsx
function SidebarShell() {
  const { markReady } = react.useReadySignal({
    checkpoint: "sidebarReady",
  })

  return <ThirdPartySidebar onReady={markReady} />
}
```

---

## 21. Practical guidance for heavy components

Because `markReady` changes when the relevant ready handle changes, the cleanest usage is:

- place `useReadySignal(...)` in a small local bridge node when needed
- avoid hanging it unnecessarily high in a huge expensive subtree

This is not because the model is unstable.
It is because the callback must remain safely bound to the current handle.

---

## 22. Non-goals / out of scope for v1

- provider/context-based multi-instance React support by default
- animation settled tracking in the core
- DOM `transitionend` ownership in the core
- OR / nested checkpoint logic
- fail-open timeout reveal
- exposing internal selector strings publicly
- exposing internal ready-handle structure publicly
- general-purpose state manager integration

---

## 23. Final decisions summary

- core is plain TypeScript
- React bindings are separate
- config is object-based and inferred
- scenarios derive awaited checkpoints from targeted surfaces
- new run fully preempts previous run
- targeted surfaces start hidden
- non-targeted surfaces are forced visible
- no auto-start boot scenario
- `initialHidden` is per-surface
- raw surface state = `hidden + scenario + interrupted + elapsedMs`
- `elapsedMs` is a final duration snapshot, not a live timer
- ready is not a sticky boolean
- ready means “current handle acknowledged”
- ready handles are opaque and owned by the core
- `markReady` is stable per current handle, not for full component lifetime
- stale async callbacks are ignored by the core
- React never manually builds selector strings
- no Provider by default in v1
- app-specific motion/visual logic stays outside the core

---

## 24. Implementation status

At this point, the design is considered complete enough to move to implementation.

What remains is mechanical:
- exact config utility-type implementation
- exact reducer implementation
- exact ready-handle registry implementation
- exact React binding implementation
- tests for races and persistent hidden activities
