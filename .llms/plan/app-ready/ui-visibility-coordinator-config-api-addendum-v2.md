# UI Visibility Coordinator — Config/API Addendum

This addendum records only the configuration and public API decisions validated in the latest discussion. It does not repeat previously frozen terminology, ticketing logic, or reducer behavior already captured elsewhere.

## Frozen config shape

```ts
const spec = defineVisibilitySpec({
  surfaces: {
    sidebar: {
      checkpoints: ["sidebarReady"],
    },
    threadPane: {
      keyed: true,
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

## Meaning of the config

- `surfaces`
  - declares each surface
  - each surface owns its checkpoints
  - `keyed: true` means the surface requires a `runKey` whenever it participates

- `scenarios`
  - declares each scenario
  - each scenario references only surfaces
  - awaited checkpoints are derived implicitly from targeted surfaces
  - a scenario requires `runKey` if at least one targeted surface is keyed

## Normalized spec type direction

```ts
type VisibilitySpec = {
  surfaces: Record<
    string,
    {
      keyed?: true
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

## Why this shape

This shape was chosen because it is:
- minimal
- readable without documentation
- self-explanatory
- easy to infer from
- free of duplicated declarations

Notably absent on purpose:
- no explicit `waitsFor`
- no explicit `subject` metadata on scenarios
- no motion/reducer logic in the core config
- no participant entity in the config

## Runtime API direction

```ts
const visibility = createVisibilityCoordinator(spec)
```

### Start a run

```ts
visibility.startRun("appBoot", { runKey: activeThreadId })
visibility.startRun("threadSwitch", { runKey: nextThreadId })
```

Type rule:
- `runKey` is required if the targeted scenario includes at least one keyed surface
- otherwise it is not accepted / not required

### Read a surface state

```ts
const sidebarState = visibility.useSurfaceState("sidebar")
const threadPaneState = visibility.useSurfaceState("threadPane")
```

### Emit a ready signal

Public naming is still open, but the runtime shape currently discussed is:

```ts
visibility.useReadySignal({
  checkpoint: "sidebarReady",
})

visibility.useReadySignal({
  checkpoint: "activeThreadReady",
  runKey: threadId,
})
```

This hook is expected to encapsulate the already-frozen ticket-aware behavior:
- it internally reacts to the current ticket relevant to the checkpoint
- it supports local sticky readiness
- it re-acks automatically when a new relevant ticket is emitted and local readiness is already true

So the ticket protocol remains internal; the public hook stays ergonomic.

## Public surface state

`phase` was removed because it duplicated `hidden`.

Public state direction:

```ts
type SurfaceState<ScenarioId extends string> = {
  hidden: boolean
  scenario: ScenarioId
  elapsedMs: number
  interrupted: boolean
}
```

Notes:
- `hidden` is the main visibility signal
- `scenario` identifies which scenario produced the current state
- `elapsedMs` is public; raw timestamps remain an internal detail
- `interrupted` is used to skip or adapt animations when a previous run was preempted

## Fluent builder direction

The builder is accepted as optional syntax sugar only.
It must compile to the same normalized spec shape.

Example direction:

```ts
const spec = visibilitySpec()
  .addSurface("sidebar", {
    checkpoints: ["sidebarReady"],
  })
  .addSurface("threadPane", {
    keyed: true,
    checkpoints: ["activeThreadReady"],
  })
  .addScenario("appBoot", {
    surfaces: ["sidebar", "threadPane"],
  })
  .addScenario("threadSwitch", {
    surfaces: ["threadPane"],
  })
  .build()
```

Important constraint:
- the builder is not the source of truth
- the normalized object spec remains the real model

## Example: build a UI transition layer on top of the core API

Motion / transition state stays outside the core.
A UI-layer hook can derive richer state from `useSurfaceState(...)`.

```ts
function useThreadPaneTransitionState() {
  const state = visibility.useSurfaceState("threadPane")

  const durationMs =
    state.interrupted ? 0 :
    state.hidden ? 0 :
    state.elapsedMs < 100 ? 0 :
    160

  return {
    hidden: state.hidden,
    durationMs,
    easing: "ease-out" as const,
  }
}
```

This preserves the intended separation:
- core = visibility coordination
- app layer = transition semantics

## What remains before implementation

Main remaining implementation steps:
1. freeze the exact TS contract and inference behavior of `defineVisibilitySpec(...)`
2. freeze internal reducer/store events
3. implement the ticket-aware ready hook
4. implement public `SurfaceState` projection
5. add race/preemption tests
