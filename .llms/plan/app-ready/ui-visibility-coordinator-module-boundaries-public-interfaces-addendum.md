# UI Visibility Coordinator — Module Boundaries / Public Interfaces Addendum

This addendum records only the latest validated module split, public interfaces, and examples. It does not repeat earlier docs.

## Final module split

The system is split into four distinct layers:

1. `defineVisibilitySpec(...)`
2. `createVisibilityCoordinator(spec)`
3. `createReactVisibilityBindings(coordinator)`
4. app-level raw-state projection (`raw -> visual/business state`)

## 1) `defineVisibilitySpec(...)`

Role:
- freeze the config
- infer literal unions from the spec
- validate cross references

Shape direction:

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

declare function defineVisibilitySpec<const T extends VisibilitySpec>(
  spec: T
): T
```

This layer is:
- pure data
- pure typing
- no runtime orchestration
- no React

## 2) `createVisibilityCoordinator(spec)`

Role:
- create the plain TypeScript runtime
- own internal state
- own the internal reducer/state machine
- own fine-grained subscriptions
- expose imperative runtime methods

Public interface direction:

```ts
type Unsubscribe = () => void
type Listener = () => void

type SurfaceState<ScenarioId extends string> = {
  hidden: boolean
  scenario: "initial" | ScenarioId
  interrupted: boolean
  elapsedMs: number
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
  startRun(...args: StartRunArgs<ScenarioId, ScenarioNeedsKey>): void

  getSurfaceState(surface: SurfaceId): SurfaceState<ScenarioId>

  subscribeSurfaceState(
    surface: SurfaceId,
    listener: Listener
  ): Unsubscribe

  signalReady(input: ReadySignalInput): void

  subscribeReadySignal(
    input: ReadySignalInput,
    listener: Listener
  ): Unsubscribe
}
```

Coordinator responsibilities:
- no React
- no CSS logic
- no app-level visual projection
- only orchestration + subscriptions

## 3) `createReactVisibilityBindings(coordinator)`

Role:
- adapt the coordinator runtime to React
- expose stable hooks
- optionally expose a Provider with a stable coordinator instance

Public interface direction:

```ts
interface ReactVisibilityBindings<
  SurfaceId extends string,
  ScenarioId extends string,
  ReadySignalInput,
> {
  Provider: React.ComponentType<{
    coordinator?: VisibilityCoordinator<
      SurfaceId,
      ScenarioId,
      ReadySignalInput,
      any
    >
    children: React.ReactNode
  }>

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

React adapter responsibilities:
- `useSurfaceState(...)` via `useSyncExternalStore`
- `useReadySignal(...)` via stable callback + refs + imperative subscription
- `useReadyState(...)` built on top of `useReadySignal(...)`

## 4) App-level raw-state projection

Role:
- map generic raw `SurfaceState` into app-specific state
- keep motion / UI business logic outside the generic core

Recommended starting point: pure mapping functions.

Example:

```ts
type ThreadPaneVisualState = {
  hidden: boolean
  durationMs: number
  easing: string
  interrupted: boolean
}

declare function projectThreadPaneVisualState(
  raw: SurfaceState<"appBoot" | "threadSwitch">
): ThreadPaneVisualState
```

Optional later step:
- wrap these projections in app-level hooks if repeated often

## Derived utility-type layer

A utility-type layer is expected and legitimate.

Its role is to derive from the spec:
- `SurfaceIdFromSpec<TSpec>`
- `ScenarioIdFromSpec<TSpec>`
- `CheckpointIdFromSpec<TSpec>`
- `ReadySignalInputFromSpec<TSpec>`
- `StartRunArgsFromSpec<TSpec>`

These types are part of the design goal:
- all runtime APIs should be inferred from the spec
- keyed vs non-keyed scenarios/checkpoints should be derived, not manually duplicated

## Internal coordinator sub-parts

Before full pseudocode, the coordinator runtime is understood as composed of:

### A. spec normalization
Precompute things such as:
- scenario -> targeted surfaces
- surface -> checkpoints
- scenario -> whether `runKey` is required
- normalized ready selectors

### B. mutable current state
Own:
- active run
- current surface states
- ready selector versions / markers

### C. pure internal reducer
Consumes internal events such as:
- `RUN_STARTED`
- `READY_SIGNALLED`

Produces:
- next state
- changed surfaces
- changed ready selectors

### D. listener registries
At least two registries:
- `surface -> listeners`
- `ready selector -> listeners`

### E. public runtime facade
Exposes:
- `startRun(...)`
- `getSurfaceState(...)`
- `subscribeSurfaceState(...)`
- `signalReady(...)`
- `subscribeReadySignal(...)`

## Example composition

```ts
const spec = defineVisibilitySpec(...)
const coordinator = createVisibilityCoordinator(spec)
const react = createReactVisibilityBindings(coordinator)
```

Then app-level usage:

```ts
function useThreadPaneVisualState() {
  const raw = react.useSurfaceState("threadPane")
  return projectThreadPaneVisualState(raw)
}
```

Ready signaling usage:

```ts
const { markReady } = react.useReadySignal({
  checkpoint: "activeThreadReady",
  runKey: threadId,
})
```

Declarative ready usage:

```ts
react.useReadyState({
  checkpoint: "activeThreadReady",
  runKey: threadId,
  isReady,
})
```

## Clarification about `useReadySignal(...)`, refs, and effects

The accepted direction remains:

- `useReadySignal(...)` should not force rerenders on ticket changes
- it should keep `markReady` stable
- it should react to relevant ready-selector changes through imperative subscription

Important clarification:

The intended mechanism is **not** "refs update only on rerender".

The mechanism is:
- the hook subscribes imperatively to the relevant ready selector
- when that selector changes, the subscription callback runs
- that callback can read/write refs directly
- that callback can call `coordinator.signalReady(...)`
- none of this requires a React rerender

So the correctness does not depend on remounting or rerendering the heavy component.

What matters is:
- the effect installs the subscription once for the current selector
- the subscription callback keeps the signaling path alive
- refs keep local readiness / latest input available without render churn

This is exactly why `useReadySignal(...)` is not modeled as a `useSyncExternalStore` state consumer.
