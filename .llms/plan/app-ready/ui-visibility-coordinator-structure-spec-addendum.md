# UI Visibility Coordinator — Structure/Behavior Spec Addendum

This addendum records only the decisions validated in the latest discussion. It intentionally avoids repeating previously frozen terminology, ticketing logic, and API usage.

## Core model decisions

Internal model keeps only:
- `scenario`
- `run`
- `ticket`
- `checkpoint`
- `surface`

`participant` is removed from the internal coordinator model.

## Scenario contract

Each scenario declares exactly:
- `targetSurfaces`
- `awaitedCheckpoints`

No richer checkpoint logic in v1.

Checkpoint semantics in v1:
- readiness is an `AND`
- the run reveals only when all awaited checkpoints are acked

## Surface semantics

For every started run:
- every targeted surface is forced to `hidden`
- every non-targeted surface is forced to `visible`

When all awaited checkpoints are satisfied:
- every targeted surface becomes `visible`

Implications:
- targeted surfaces always follow `hidden -> visible`
- non-targeted surfaces are always reset to `visible`
- preemption is deterministic because the new run fully re-seeds all surfaces

## Preemption rules

A newly started run:
- fully preempts the previous run
- replaces it as the single active run
- resets all surfaces immediately according to the new scenario rules

Late events from older runs are ignored via normal ticket/run filtering.

## What is hardcoded in v1

Hardcoded behavior:
- single active run
- total preemption on new run
- targeted surfaces start hidden
- non-targeted surfaces start visible
- targeted surfaces reveal only after all checkpoints are acked
- checkpoint aggregation is strict `AND`
- all surfaces are recomputed on every new run start

## What is configurable

Configurable per scenario:
- `targetSurfaces`
- `awaitedCheckpoints`
- reveal motion resolver
- optional start motion resolver

Configurable per surface snapshot:
- visibility intent
- motion spec

## Motion / animation ownership

The coordinator owns:
- visibility intent (`hidden` / `visible`)
- motion spec values

The coordinator does **not** own:
- real animation completion
- `transitionend`
- global `settled` / `revealed` lifecycle after CSS completes

Any need for:
- unmount-after-animation
- pointer-event toggling after settle
- local `isAnimating`
- DOM transition callbacks

must be handled locally by the surface adapter/component, not by the coordinator core.

## Explicitly out of scope for v1

Out of scope:
- participant grouping as a stateful core entity
- non-`AND` checkpoint logic (`OR`, groups, nesting)
- preserving untouched surfaces as-is
- global settled/transition-complete state in the coordinator
- timeout-based fail-open reveal
- animation completion tracked with coordinator timers

## Failure policy

If a required checkpoint never arrives:
- the coordinator does not auto-reveal
- this is treated as an error condition
- error handling / recovery is outside the coordinator spec

## Data-shape direction

Recommended scenario shape:

```ts
type ScenarioDefinition = {
  id: ScenarioId
  targetSurfaces: readonly SurfaceId[]
  awaitedCheckpoints: readonly CheckpointRequirement[]
  resolveRevealMotion: (args: {
    surface: SurfaceId
    scenarioId: ScenarioId
    startedAt: number
    readyAt: number
    wasPreemptedPreviousRun: boolean
  }) => MotionSpec
  resolveStartMotion?: (args: {
    surface: SurfaceId
    scenarioId: ScenarioId
    preemptedRunId: number | null
  }) => MotionSpec
}
```

Recommended runtime direction:

```ts
type ActiveRun = {
  runId: number
  scenarioId: ScenarioId
  subjectKey?: SubjectKey
  startedAt: number
  pendingCheckpointKeys: Set<string>
  receivedCheckpointKeys: Set<string>
}

type CoordinatorState = {
  activeRun: ActiveRun | null
  surfaces: Record<SurfaceId, SurfaceSnapshot>
}
```

## Normalized checkpoint key rule

Expected checkpoints should be normalized to concrete keys when a run starts.

Examples:
- no subject: `sidebarReady`
- run subject applied: `activeThreadReady::thread-123`

This lets the active run compare acks against resolved expectations without extra ambiguity.
