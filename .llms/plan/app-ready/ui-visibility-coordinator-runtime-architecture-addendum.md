# UI Visibility Coordinator — Runtime Architecture Addendum

This addendum records only the newly validated runtime architecture decisions. It does not repeat earlier docs.

## Coordinator runtime model

`createVisibilityCoordinator(spec)` creates a **plain TypeScript runtime**, not a React state container.

The coordinator owns:
- internal mutable state
- pure reducer execution
- observer / observable mechanics
- fine-grained subscriptions
- imperative runtime methods

The coordinator is the runtime store/observable itself.

There is no separate public "store" concept.

## React bindings are external

React bindings are **not** the coordinator core.

They are a thin adapter layer built on top of the coordinator runtime.

Responsibilities of the React adapter:
- bridge `subscribe + getSnapshot` to `useSyncExternalStore`
- expose `useSurfaceState(...)`
- expose `useReadySignal(...)`
- expose `useReadyState(...)`
- optionally expose a provider that only passes a stable coordinator instance

This keeps:
- the core runtime framework-agnostic
- the reducer/store testable outside React
- the React integration minimal

## Runtime layering

Recommended internal layering:

1. spec
2. pure reducer
3. mutable current state
4. listener registries
5. runtime coordinator instance
6. optional React bindings

## Subscription model

The coordinator must support fine-grained subscriptions.

Two distinct observable channels are needed:

### Surface subscriptions
Used by `useSurfaceState(surface)`.

Contract:
- subscribe to one surface only
- only notify when that surface snapshot changes

### Ticket subscriptions
Used by ready signaling.

Contract:
- subscribe to one normalized checkpoint key only
- only notify when that ticket key changes

Examples of normalized checkpoint keys:
- `sidebarReady`
- `activeThreadReady::thread-123`

## React usage rules

### `useSurfaceState(...)`
Should use `useSyncExternalStore`.

Reason:
- it is expected to rerender the component when the relevant surface changes

### `useReadySignal(...)`
Should **not** rely on `useSyncExternalStore` for its core behavior.

Reason:
- the goal is to avoid rerendering heavy components just because a relevant ticket changed
- ready signaling should happen behind the hook/store boundary via subscriptions, refs, and a stable callback

### `useReadyState(...)`
Should be layered on top of `useReadySignal(...)`.

It is only a declarative bridge from local `isReady` state to the same ticket-aware signaling path.

## Stable callback requirement

`useReadySignal(...)` must expose a stable `markReady` callback.

Design implication:
- ticket freshness must be handled internally
- callback identity must not churn on ticket updates
- refs and direct coordinator lookups are acceptable implementation tools

## Accepted perf direction

Heavy components that emit ready events must not rerender because of unrelated tickets.

Preferred design:
- the heavy component receives a stable `markReady`
- ticket-aware behavior lives internally in the ready hook
- ticket changes are handled through fine-grained subscription, refs, and imperative coordinator access
- unrelated ticket updates never bubble into broad rerenders

## Example target runtime shape

```ts
type VisibilityCoordinator = {
  startRun(...)
  getSurfaceSnapshot(surface)
  subscribeSurface(surface, listener)

  getTicketSnapshot(checkpointKey)
  subscribeTicket(checkpointKey, listener)
}
```

This is not a final API freeze, only the currently accepted architectural direction.

## Example reducer/store split inside the coordinator

```ts
function createVisibilityCoordinator(spec) {
  let state = createInitialState(spec)

  const surfaceListeners = new Map()
  const ticketListeners = new Map()

  function dispatch(event) {
    const result = reduce(spec, state, event)
    state = result.state

    for (const surface of result.changedSurfaces) {
      notifySurface(surface)
    }

    for (const checkpointKey of result.changedTicketKeys) {
      notifyTicket(checkpointKey)
    }
  }

  return {
    startRun(...) {
      dispatch(...)
    },

    getSurfaceSnapshot(surface) {
      return projectSurfaceSnapshot(state, surface)
    },

    subscribeSurface(surface, listener) {
      ...
    },

    getTicketSnapshot(checkpointKey) {
      ...
    },

    subscribeTicket(checkpointKey, listener) {
      ...
    },
  }
}
```

## Optional React adapter shape

```ts
const coordinator = createVisibilityCoordinator(spec)
const react = createReactVisibilityBindings(coordinator)
```

Possible React-facing API:
- `react.Provider`
- `react.useSurfaceState(...)`
- `react.useReadySignal(...)`
- `react.useReadyState(...)`

This adapter should only ever provide a **stable coordinator instance**, never live state through context.

## What is now clearly separated

### Core runtime concerns
- run orchestration
- checkpoint ack handling
- ticket lifecycle
- surface visibility state
- subscriptions

### React/UI concerns
- rerendering subscribed components
- stable ready callbacks inside hooks
- local projection from raw surface state to richer UI state

## Still intentionally unresolved

Not frozen yet:
- final exact coordinator method names
- final exact React adapter factory name
- final exact internal state shape
- final exact reducer event union
- whether the React adapter is bundled by default or created explicitly
