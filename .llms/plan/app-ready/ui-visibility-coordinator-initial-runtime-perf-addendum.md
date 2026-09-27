# UI Visibility Coordinator — Initial State / Runtime API / Perf Addendum

This addendum records only the newly validated decisions from the latest discussion. It does not repeat earlier docs.

## Newly frozen config/runtime decisions

### Initial state per surface

Each surface may declare:

```ts
initialHidden?: boolean
```

Rules:
- optional
- default = `false`
- applies before the first run starts
- this is **not** an auto-started scenario

Example:

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

## No automatic boot scenario

The coordinator does **not** auto-start `appBoot`.

Reason:
- the coordinator does not know the `runKey`
- explicit `startRun(...)` is clearer
- initial UI state is handled by `initialHidden`

Boot orchestration remains app-level.

## Public surface state

```ts
type SurfaceState<ScenarioId extends string> = {
  hidden: boolean
  scenario: "initial" | ScenarioId
  elapsedMs: number
  interrupted: boolean
}
```

Notes:
- `scenario` includes `"initial"` before the first run
- `phase` was removed because it duplicated `hidden`
- no public `runId`, `runKey`, `changedAt`, or other internal fields

## Runtime API names frozen

### Run trigger

```ts
startRun(scenario, { runKey? })
```

### Surface read hook

```ts
useSurfaceState(surface)
```

### Imperative ready hook

```ts
const { markReady } = useReadySignal({
  checkpoint,
  runKey?,
})
```

### Declarative ready hook

```ts
useReadyState({
  checkpoint,
  runKey?,
  isReady,
})
```

## Hook layering rule

`useReadySignal` is the lower-level primitive.

`useReadyState` is built on top of it:
- it observes a local `isReady` boolean
- it proxies readiness through the same ticket-aware signaling path
- it should not duplicate the signaling protocol

## Perf rules now part of the spec

### Surface subscriptions

`useSurfaceState(surface)` must rerender **only** when the state of that specific surface changes.

### Ticket subscriptions

`useReadySignal({ checkpoint, runKey })` and `useReadyState(...)` must react **only** to the relevant normalized ticket key.

Examples:
- `sidebarReady`
- `activeThreadReady::thread-123`

A ticket for a different checkpoint or different `runKey` must not trigger work for unrelated consumers.

### Stable imperative callback

`markReady` must be stable.

Implications:
- do not recreate the callback on unrelated ticket/store changes
- internal freshness must be handled through refs/store lookups rather than callback identity churn

### Avoiding heavy rerenders

A heavy conversation component should not rerender just because unrelated tickets changed.

This is a first-class requirement.

Design direction accepted:
- keep subscription granularity extremely fine
- make the imperative callback stable
- let the hook/store internals react to relevant ticket changes without broad component rerenders

## Accepted architectural direction for perf-sensitive ready signaling

The desired direction is:

- the component receives a stable `markReady`
- ticket-aware logic lives behind the hook/store boundary
- relevant ticket changes are handled internally with fine-grained subscription
- unrelated ticket changes do not bubble into expensive component rerenders

This means the implementation may rely on:
- external store subscriptions
- refs
- stable callback wrappers
- other internal indirection

but the public contract remains stable and simple.

## Example boot bridge

```tsx
function VisibilityRunBridge() {
  const { currentThreadId } = useNav()
  const hasBootedRef = useRef(false)
  const previousThreadIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!hasBootedRef.current) {
      hasBootedRef.current = true
      previousThreadIdRef.current = currentThreadId

      visibility.startRun("appBoot", {
        runKey: currentThreadId,
      })
      return
    }

    if (previousThreadIdRef.current === currentThreadId) return

    previousThreadIdRef.current = currentThreadId

    visibility.startRun("threadSwitch", {
      runKey: currentThreadId,
    })
  }, [currentThreadId])

  return null
}
```

## Example imperative ready usage

```tsx
function ThreadRenderer({ threadId }: { threadId: string }) {
  const { markReady } = visibility.useReadySignal({
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

## Example declarative ready usage

```tsx
function ThreadReadyBridge({ threadId }: { threadId: string }) {
  const messagesReady = useMessagesHydrated(threadId)
  const layoutReady = useThreadLayoutStable(threadId)
  const editorReady = useComposerReady(threadId)

  const isReady = messagesReady && layoutReady && editorReady

  visibility.useReadyState({
    checkpoint: "activeThreadReady",
    runKey: threadId,
    isReady,
  })

  return null
}
```

## Example surface consumption

```tsx
function ThreadPaneOverlay() {
  const state = visibility.useSurfaceState("threadPane")

  return (
    <div
      style={{
        opacity: state.hidden ? 1 : 0,
      }}
    />
  )
}
```

## Still intentionally internal / unresolved

These are not public API decisions yet:
- exact internal store shape
- exact `useSyncExternalStore` wiring
- exact stable-callback implementation details
- whether a tiny internal provider/context bridge is used to avoid expensive rerenders
