# Messages store — consolidated decisions

Distilled from `archive/3-*/GRILL_ME_MESSAGES.md` (Legend-State session, Apr 14–17) and `archive/4-*/GRILL_ME_MESSAGES.md` (zustand session, Apr 18), plus v4 code (May 3). Re-validate in Phase 4 after upgrades; these are the starting point, not dogma.

## Goal

Streaming a token re-renders only the tail message's content subtree. Handoffs between sources (cache → persisted, optimistic → persisted, http/resumed → persisted) re-render nothing if visible output is unchanged. Initial cached (stale) data paints on first render, no empty flash.

## Invariants (dev: throw on violation)

- `message.id` = identity
- `role` immutable after creation
- `part.type` immutable
- parts are **append-only**; only the tail part may mutate; a non-tail part is frozen → part index is a valid identity, no part ids needed
- precedence: `hot (http, resumed) > optimistic > persisted > cache`
- `lifecycleState` deleted/archived → filtered from visible output

## Architecture (converged across all attempts)

```
sources (React hooks)          → projection (pure TS)               → store (zustand/vanilla, per session) → granular hooks
cache, persisted, optimistic,     merge by precedence, trim rules,      orderedIds, per-id role/parts/metadata    useMessageIds, useMessageParts(id)…
resumed stream, http stream       stabilize refs (the heart)
```

- Store: `zustand/vanilla`, one per `ChatSessionScope`, freed with the scope (Legend-State tried in v2: typing of rich `parts` got awkward → dropped)
- Single writer: only the projection writes
- Core read API (explicit primitives only, no generic selector, no `MyUIMessage[]`):
  - `useMessageIds()`, `useMessageRole(id)`, `useMessageParts(id)`, `useMessageMetadata(id)`
  - non-reactive peeks for actions (copy, regenerate) and for virtualizer `getItemType`
- Granularity floor: `parts` slice and `metadata` slice. Filtered-parts hooks live in L3 `_hooks`.
- Hot sources ignore metadata churn while streaming (intentional). `metadata.debug` ignored unless debug flag on.
- Flush: one microtask-coalesced commit. No extra throttling beyond upstream 5fps.
- Sync seed from cache on store creation (no empty first paint).
- Render: split `ChatMessageAssistant` so markdown subtree depends on `parts` only; no rebuilding a full message object on the render path.
- Session-level state (status, pendingAutoScroll, actions) stays in context, **never** depends on `messages` (today `regenerate` does → actions churn).

## v4-specific ideas worth keeping

- **Sources as headless components** (`<SourceCache/>`, `<SourcePersistedPaginated/>`, `<SourceResumedStream/>`, `<SourceDirectStream/>`): a stream tick re-renders only that tiny component, not a provider running every hook.
- Layers kept as plain snapshots + projection as pure functions (simpler to read than v3's private reconciler with dirty ids).

## Open design questions (decide in the Phase 4 grill)

1. Layers in public store (v4) vs private reconciler + store holds only merged result (v3)? Trade: readability vs one notify wave per flush.
2. Stabilization algorithm: exact rule for `parts` (length equal + tail equal → reuse; else reuse frozen prefix, replace tail) and for `metadata` (shallow compare, ignore `debug`)?
3. Order key: `createdAt` missing (optimistic) → what's the stable fallback (insertion index)?
4. Store lifetime vs `<Activity>`: create in `useState` initializer, dispose only on real unmount (or never dispose; let GC collect with scope).
5. Does the upgraded AI SDK change resumed-stream reconstruction or offer something better?

## Reusable assets on archived branches

- tested trim helpers (persisted pending-tail trim during resume, cache overlap trim): `archive/messages-2-stability` → `apps/web/src/lib/message-assembly/*`, and `archive/messages-4-v3-zustand` → `conversation-message-helpers.ts`
- dev invariant validator + tests: `archive/messages-3-perf-v2-legend` → `apps/web/src/lib/messages/messages-validator.ts`
- v4 core files: `archive/messages-5-v4-zustand` → `apps/web/src/hooks/chat/messages/**`

## Learning path suggestion (to own it)

Write these yourself, in order, each with tests: `stabilizeMessage(prev, next)` → `projectMessages(layers, prev)` → store + hooks → one source → wire in `/components/conversation` demo route → remaining sources → live swap.
