# UI Visibility Coordinator — Final Runtime Decisions Addendum

This addendum records only the last validated runtime decisions. It does not repeat earlier docs.

## Important clarification: `ReadyHandle` is opaque

`ReadyHandle` does **not** mean:
- a manually concatenated string
- a public `"checkpoint::runKey"` API
- something the app constructs itself

That normalized selector form is **internal only**.

Accepted direction:
- the core internally normalizes selectors however it wants
- the core internally creates ready tickets/handles
- the React binding reads the current core-issued handle
- the binding later passes that same opaque handle back to the core

So:
- normalized selector strings stay internal
- ticket/handle logic stays in the core
- the app never manually builds a selector string

## Public-facing ready input remains structured

The app-facing input remains structured and typed from the spec.

Example shape direction:

```ts
type ReadySignalInput =
  | { checkpoint: "sidebarReady" }
  | { checkpoint: "activeThreadReady"; runKey: string }
```

This is what the React binding consumes.

The binding then asks the core for the **current opaque handle** matching that structured input.

## Accepted core direction

The core should expose a way to retrieve the current ready handle for a structured ready input.

Direction accepted:

```ts
getCurrentReadyHandle(input)
signalReady(handle)
```

Meaning:
- `getCurrentReadyHandle(input)` takes structured app-facing input
- `signalReady(handle)` takes the opaque core-issued handle
- the app itself never constructs or manipulates handles directly

## Why `signalReady(handle)` is preferred

Using the opaque handle keeps all ticket validation in the core:
- stale handle detection
- current-ticket matching
- race-condition protection

This avoids leaking ticket semantics into React or app code.

## `markReady` stability rule frozen

`markReady` is **stable for the current handle**, not stable for the entire lifetime of the component.

When a new relevant handle is emitted:
- a new `markReady` must be produced
- old callback references become stale
- if an old callback is called later, the core ignores it safely

This is the chosen compromise to correctly handle:
- async late callbacks
- A -> B -> A races
- persistent hidden activities

## No Provider by default

`createReactVisibilityBindings(coordinator)` should close over the coordinator instance directly.

So v1 does **not** require a Provider/context by default.

Reason:
- no need to broadcast live state through React context
- subscriptions already happen directly against the coordinator runtime
- this keeps the React layer smaller

A Provider/context-based variant can still be added later if a real multi-instance use case appears.

## Final accepted direction summary

### App code works with:
- structured ready input
- structured `startRun(...)` input
- no manual selector string building
- no direct ticket manipulation

### Core owns:
- selector normalization
- ready handle generation
- ready handle validation
- stale callback rejection

### React binding owns:
- observing the current handle for a structured ready input
- exposing a `markReady` bound to that handle
- rebuilding that callback only when the relevant handle changes
