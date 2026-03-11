# App Ready Transitions Spec (V1)

Status: planning-only (no implementation in this step).

This file is the authoritative plan for next implementation.

---

## 0) Change Control (strict)

Only changes explicitly listed in this spec are allowed.

Anything outside scope must be discussed and approved first.

---

## 1) Goal

Ship exactly this behavior:

1. `initial-load`
- `sidebar-content` and `conversation-content` start hidden
- both reveal together when both are ready

2. `navigation` (thread-to-thread)
- conversation hides instantly
- conversation reveals when next conversation is ready
- adaptive reveal timing by wait duration

3. keep it simple
- no input ownership/session refactor in V1
- remove legacy app-load wiring from prompt-input path (no replacement input transition logic yet)
- no phase2 architecture work in V1

---

## 2) Domain Model (terms)

### Loop kind

- `initial-load`
- `navigation`

Single active loop at a time. New loop cancels prior unfinished loop.

### UI destinations (what can be hidden/revealed)

- `sidebar-content`
- `sidebar-floating-actions`
- `conversation-content`

### Readiness scopes (grouped readiness semantics)

- `sidebar`
- `conversation`

### Ready signals (actual emitters)

- scope `sidebar` signals:
  - `sidebar-thread-history-layout`
- scope `conversation` signals:
  - `conversation-layout`

Scope readiness rule (V1):

- a scope is ready only when all its configured signals fired at least once in current cycle

Key principle: source components emit signals only. They do not choose loop kind.

---

## 3) V1 Behavior Contract

### Loop: `initial-load`

- hidden destinations:
  - `sidebar-content`
  - `sidebar-floating-actions`
  - `conversation-content`
- required readiness scopes:
  - `sidebar`
  - `conversation`
- release:
  - all hidden destinations reveal together
  - normal transition (unless reduced-motion)

### Loop: `navigation`

- triggered by thread route identity change
  - includes `threadId` transitions to/from `null`
- hidden destinations:
  - `conversation-content` only
- required readiness scopes:
  - `conversation`
- release:
  - reveal `conversation-content`
  - adaptive preset:
    - `<100ms` -> `none`
    - `100ms..<200ms` -> `fast`
    - `>=200ms` -> `normal`

Reduced motion: always `none`.

Preemption rule:

- starting a new loop cancels prior unfinished loop immediately
- new loop hidden set is applied immediately
- any destination not in new hidden set becomes visible immediately (prevents stale hidden deadlocks)

---

## 4) Config Shape

```ts
type AppReadyLoopKind = "initial-load" | "navigation";

type AppReadyDestination =
  | "sidebar-content"
  | "sidebar-floating-actions"
  | "conversation-content";

type AppReadyScope = "sidebar" | "conversation";

type AppReadySignal =
  | "sidebar-thread-history-layout"
  | "conversation-layout";

const appReadyConfig = {
  scopeSignals: {
    sidebar: ["sidebar-thread-history-layout"],
    conversation: ["conversation-layout"],
  },
  loops: {
    "initial-load": {
      hiddenDestinations: [
        "sidebar-content",
        "sidebar-floating-actions",
        "conversation-content",
      ],
      requiredScopes: ["sidebar", "conversation"],
      transitionPolicy: "normal",
    },
    navigation: {
      hiddenDestinations: ["conversation-content"],
      requiredScopes: ["conversation"],
      transitionPolicy: "adaptive-by-wait",
    },
  },
} as const;
```

Runtime note:

- core can derive an internal `signalToScope` map from `scopeSignals` at init for O(1) signal routing

---

## 5) State Machine

```text
on provider mount:
  start loop(initial-load, cycle=1)
  hide destinations from initial-load config
  wait required scopes

on all required scopes ready:
  resolve transition preset
  phase -> revealing (or visible if preset=none)
  phase -> visible

on navigation identity changed:
  start loop(navigation, cycle++)
  clear readiness for new cycle
  hide destinations from navigation config
  reveal destinations not hidden by navigation config
  wait required scopes

on all required scopes ready:
  resolve adaptive transition
  phase -> revealing/visible
```

### Cycle safety (rapid navigations)

- every loop increments `cycleId`
- each signal writes to current cycle only
- stale late signals from old cycle are ignored
- starting a new loop always preempts prior unfinished loop

No cross-loop deadlock.

Note: if current loop never gets its required scope, it remains hidden by design (real missing signal), but previous loop can never block new loop.

---

## 6) Routing Bridge Pattern (clean)

Avoid ad-hoc `__new__` string hacks and avoid “ignore first observation” in bridge.

Use explicit typed route identity object.

```ts
type AppReadyNavigationIdentity = {
  routeKind: "chat-thread";
  threadId: string | null;
};
```

Bridge responsibilities only:

- derive identity from router params
- publish identity to core

Core responsibilities:

- keep previous identity snapshot
- first snapshot initializes baseline only
- changed snapshot starts `navigation` loop

So “first observation” handling lives in core, not bridge.

---

## 7) Public API

## Provider

```ts
function AppReadyProvider({ children }: { children: ReactNode }): JSX.Element;
```

## Destination binding (UI side)

```ts
function useAppReadyUiDestination(destination: AppReadyDestination): {
  cycleId: number;
  loopKind: AppReadyLoopKind;
  phase: "hidden" | "revealing" | "visible";
  hidden: boolean;
  transition: {
    preset: "none" | "fast" | "normal";
    durationMs: number;
    easing: string;
  };
};
```

## Base signal action (source side)

```ts
function useAppReadySignalAction(signal: AppReadySignal): {
  ready: () => void;
};
```

## Boolean convenience

```ts
function useAppReadySignalBoolean(
  signal: AppReadySignal,
  options: {
    ready: boolean;
    skip?: boolean;
  }
): void;
```

## Layout convenience

```ts
function useAppReadySignalOnLayoutEffect(
  signal: AppReadySignal,
  options?: { skip?: boolean }
): void;
```

## Double RAF convenience

```ts
function useAppReadySignalOnDoubleRafEffect(
  signal: AppReadySignal,
  options?: { skip?: boolean }
): void;
```

All convenience hooks are thin wrappers over `useAppReadySignalAction`.

## Global lock (non-React consumers)

Keep one global controllable promise lock (`appLoadPromise`) for non-React deferred tasks.

- suspend when active loop phase is not `visible`
- resolve when active loop phase becomes `visible`
- applies to both `initial-load` and `navigation`
- single lock only (no per-scope lock in V1)

---

## 8) Performance Contract (must)

### Destination hooks

- `useAppReadyUiDestination` should be consumed only by tiny wrapper/overlay components
- critical heavy subtrees (conversation rendering subtree) must not subscribe

### Conversation hide/reveal

- use persistent overlay sibling above conversation remount boundary
- overlay reads destination state
- conversation component itself should not rerender because of destination state changes

### Signal hooks

- signal hooks must not own React state
- use refs + stable callbacks only
- no signal hook should cause rerender loops
- repeated `ready()` calls in same cycle must be idempotent no-op in core

### CSS

- opacity + pointer-events only
- no layout-affecting transitions

---

## 9) UI Layering Rule (L2 vs L3)

No app-ready logic in L2.

- L2 remains app-agnostic.
- hide/reveal bindings live in L3 wrappers around L2 components.

So sidebar hide is handled in chat/sidebar L3 adapter/wrapper, not in L2 primitives.

---

## 10) File Structure (one logical thing per file)

### Core infra

```txt
apps/web/src/hooks/
  use-app-ready.tsx
  use-app-ready-router-bridge.tsx
```

### Chat UI destination binding

```txt
apps/web/src/components/chat/_parts/
  conversation-ready-overlay.tsx
```

Sidebar destination binding is also part of V1, but kept inline in L3 adapter for simplicity:

```txt
apps/web/src/components/chat/sidebar/
  sidebar.tsx         # binds `sidebar-content` destination + sidebar ready signal
  sidebar-layout.tsx  # binds `sidebar-floating-actions` destination className passthrough
```

No micro-file sprawl.

---

## 11) Integration Plan (step-by-step)

1. Refactor/replace legacy app load provider logic into `use-app-ready.tsx`.
2. Implement loop machine + destination/scope/signal config.
3. Implement transition resolver for `initial-load` + `navigation`.
4. Implement typed identity publish API in core.
5. Implement `use-app-ready-router-bridge.tsx`.
6. Mount provider in `main.tsx` (same provider slot as legacy intent).
7. Mount router bridge in `_chat.tsx`.
8. Add conversation overlay part and bind `conversation-content` destination.
9. Wire `conversation-layout` in `conversation.tsx` with placeholder readiness logic:
   - use layout/raf convenience hook only
   - single path for empty and non-empty states (no special-case split in V1)
10. Wire `sidebar-thread-history-layout` in `sidebar.tsx` with layout hook + `skip` while pending.
11. Add `sidebar-content` + `sidebar-floating-actions` destination bindings in sidebar L3 only.
12. Remove prompt-input legacy app-load logic only; add TODO comment for future input transition integration.
13. Remove obsolete legacy calls only where replaced by this flow.

---

## 12) Strict Allowed File Changes (V1)

Allowed:

- `apps/web/src/hooks/use-app-load-status.tsx` (or replace with `use-app-ready.tsx`)
- `apps/web/src/hooks/use-app-ready-router-bridge.tsx` (new)
- `apps/web/src/main.tsx`
- `apps/web/src/routes/_chat.tsx`
- `apps/web/src/components/chat/chat.tsx`
- `apps/web/src/components/chat/conversation/conversation.tsx`
- `apps/web/src/components/chat/sidebar/sidebar.tsx`
- `apps/web/src/components/chat/sidebar/sidebar-layout.tsx` (minimal prop/classname passthrough only)
- `apps/web/src/components/chat/_parts/conversation-ready-overlay.tsx` (new)
- `apps/web/src/components/chat/prompt-input/prompt-input.tsx` (remove legacy app-load wiring + TODO)
- `apps/web/src/hooks/use-preload.ts` (if import source changes from app-load legacy module)

Not allowed in V1:

- `apps/web/src/hooks/use-chat-nav.tsx`
- other prompt-input files outside `prompt-input.tsx`
- broad `sidebar-layout.tsx` API churn unless strictly required by this feature
- unrelated demo/component routes
- phase2 architecture refactors

---

## 13) Sequence Examples

### Hard load

```text
mount provider
  -> loop=initial-load cycle=1
  -> hide sidebar-content + sidebar-floating-actions + conversation-content

sidebar emits sidebar-thread-history-layout
conversation emits conversation-layout

required scopes satisfied (sidebar + conversation)
  -> release all hidden destinations together
```

### Rapid nav before initial ready

```text
cycle=1 initial-load (not ready yet)
nav to A -> cycle=2 navigation starts (conversation hidden)
nav to B -> cycle=3 navigation starts (conversation hidden)
late signal from cycle=1 arrives -> ignored
signal for cycle=3 arrives -> release cycle=3
```

---

## 14) Verification Checklist

1. hard load: all initial-load destinations hidden then reveal together
2. navigation: conversation blackout instant
3. navigation: reveal preset none/fast/normal by wait
4. repeated fast nav: no stale release from old cycles
5. empty conversation: still signals and releases
6. reduced motion: animation skipped
7. no destination-state subscription inside heavy conversation subtree
8. signal hooks do not add render churn
9. mobile sidebar floating actions hidden/revealed with sidebar on initial-load

---

## 15) Explicit Non-Goals

- input ownership/session refactor (phase2)
- nav system rewrite
- L2 redesign
- unrelated cleanup

---

## 16) Open Questions

None for V1 scope.
