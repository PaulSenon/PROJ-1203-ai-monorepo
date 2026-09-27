# UI Visibility Coordinator — Core Runtime API / Semantics Addendum

This addendum records only the newly validated decisions from the latest discussion. It does not repeat earlier docs.

## Core TS / React split reaffirmed

The architecture is frozen as two layers:

1. **Core TypeScript runtime**
2. **React bindings** created separately from a coordinator instance

React is not part of the core runtime.

## Public core responsibilities

The core runtime must expose:
- run orchestration
- surface state read access
- fine-grained surface subscriptions
- ready signaling
- fine-grained ready-signal subscriptions

The React layer adapts those capabilities into hooks.

## Public core interface direction

```ts
type Unsubscribe = () => void

type SurfaceState<ScenarioId extends string> = {
  hidden: boolean
  scenario: "initial" | ScenarioId
  interrupted: boolean
  elapsedMs: number
}

type Listener = () => void

interface VisibilityCoordinator<
  SurfaceId extends string,
  ScenarioId extends string,
  ReadySignalInput
> {
  startRun(...args: StartRunArgs<ScenarioId>): void

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

## Why there are two subscribe channels

### Surface state channel
Used to rerender consumers of a specific surface state.

Example use:
- `useSurfaceState("threadPane")`

### Ready signal channel
Used to wake up ready-signaling logic for one specific selector without forcing React rerenders.

Example use:
- `useReadySignal({ checkpoint: "activeThreadReady", runKey: threadId })`

The two channels serve different purposes and are both required.

## Runtime API naming frozen

### Core TS
- `startRun(...)`
- `getSurfaceState(...)`
- `subscribeSurfaceState(...)`
- `signalReady(...)`
- `subscribeReadySignal(...)`

### React bindings
- `useSurfaceState(...)`
- `useReadySignal(...)`
- `useReadyState(...)`

## `useReadySignal(...)` stability direction

`useReadySignal(...)` must:
- expose a stable `markReady`
- avoid rerendering heavy components when relevant tickets change
- react to relevant ready-signal changes internally through subscriptions, refs, and imperative coordinator calls

This hook should **not** rely on `useSyncExternalStore` for its main ticket-aware behavior.

## `useReadyState(...)` layering

`useReadyState(...)` is built on top of `useReadySignal(...)`.

It is only a declarative bridge from local boolean readiness to the same signaling path.

## Public surface state semantics frozen

```ts
type SurfaceState<ScenarioId extends string> = {
  hidden: boolean
  scenario: "initial" | ScenarioId
  interrupted: boolean
  elapsedMs: number
}
```

Meaning:
- `hidden`: current raw visibility state
- `scenario`: `"initial"` before any run, otherwise the scenario that produced the current state
- `interrupted`: whether this state was produced while preempting an existing run
- `elapsedMs`: duration of the completed run, not a live clock

## `elapsedMs` semantics frozen

`elapsedMs` is **not** a live running timer.

Rules:
- before the first run: `0`
- on `RUN_STARTED`: updated surfaces get `0`
- when the current run completes and reveals targeted surfaces:
  - targeted surfaces receive the final run duration:
  - `elapsedMs = readyAtMs - activeRun.startedAt`

So `elapsedMs` is a final duration snapshot for the completed run.

## Internal event wording direction

The core reducer should conceptually react to two internal events:

```ts
type InternalEvent<ScenarioId extends string, ReadySignalInput> =
  | {
      type: "RUN_STARTED"
      scenario: ScenarioId
      runKey?: string
      atMs: number
    }
  | {
      type: "READY_SIGNALLED"
      input: ReadySignalInput
      atMs: number
    }
```

These are internal runtime events, not app-level reducers.

## Important terminology clarification

Two different things must remain distinct:

### Internal coordinator reducer
Pure runtime state machine of the core.

### App-level projection / mapping
A separate function or factory that maps raw `SurfaceState` to richer UI/business state for the app.

This second mapping is not the coordinator reducer.
