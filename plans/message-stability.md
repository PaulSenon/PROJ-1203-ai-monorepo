# Plan: Message Stability

> Source PRD: `/app/.llms/ralph/message-stability-prd.md` - Referentially Stable Chat Messages With Hot-Path Merge Isolation

## Architectural decisions

Durable decisions that apply across all phases:

- **Feature boundary**: Keep this work in the web app chat domain. UI stays in L3 chat components, while the new assembly engine lives in React-free TypeScript modules outside the component tree. Do not place this logic in `ui-custom/`.
- **React boundary**: `useMessages` stays the transcript adapter seam. `use-chat-active` and current provider ownership remain intact unless a later measured bottleneck proves they block the target.
- **Canonical display order**: All message sources normalize to oldest -> newest before merge. Ordering is by canonical display order, not by source arrival order.
- **Identity key**: Message identity is `message.id`. Handoff correctness, overwrite rules, and per-row stabilization all key off that id.
- **Source precedence**: Cache < persisted Convex transcript < optimistic local patches < resumed Convex stream < live HTTP stream. This precedence becomes explicit contract, not incidental array order.
- **Two-tier assembly shape**: Preserve the current low-frequency vs high-frequency split. Rarely changing layers assemble first; streaming layers apply last on the hot path.
- **Stabilization scope**: Reuse is narrow and schema-aware only: message object, `metadata`, and unchanged `parts`. No generic deep-equality reuse engine.
- **Deferred selector policy**: Start with one simple metadata reuse rule. Only add source-aware hot-vs-cold metadata selectors later if a measured need or real metadata consumer appears.
- **Debug metadata policy**: Debug origin tagging must never force production hot-path clones. Any source-origin decoration must be dev-only or separately layered.
- **Resumed stream policy**: Resumed-stream reconstruction reuses prior built state for the same stream lifecycle and resets only when stream identity changes.
- **Cache policy**: User cache remains a recent-tail snapshot only. Cache writes become deduped by meaningful tail change instead of writing every hot merge tick.
- **Rendering policy**: Static vs streaming rendering becomes explicit. Settled rows should render through cheaper static paths; only the active changing tail keeps streaming-oriented behavior.
- **Escalation rule**: A local message entity store is allowed only as Phase 5 escalation, and only if Phases 1-4 miss an agreed perf target. If adopted, the list subscribes to ordered ids and rows subscribe by message id.
- **Testing policy**: Primary confidence comes from deterministic Vitest coverage on the pure assembly modules. React tests stay thin and integration-focused.

---

## Phase 1: Lock Contracts And Baseline

**User stories**: 12, 13, 18, 21, 25, 27, 29, 30, 31

### What to build

Codify the current transcript behavior before reshaping it. Define the assembly invariants as tests and add temporary measurement hooks around the current hot path so later phases can prove improvement instead of guessing. Keep user-visible behavior unchanged.

Implementation details:

- Write pure scenario fixtures for the current source set: cache snapshot, paginated persisted messages, resumed stream, HTTP stream, optimistic patches.
- Add contract tests for canonical order, precedence, lifecycle filtering, pagination prepend safety, optimistic apply/revert, and HTTP/resume ownership handoff.
- Add temporary dev-only counters for: assembly duration, changed ids vs changed references, reused message count, reused part count, cache-write count, and visible-row rerender count.
- Record an explicit "good enough" measurement table in this plan or follow-up notes before Phase 5 is allowed.

### Acceptance criteria

- [ ] Pure tests exist for ordering, precedence, handoff continuity, optimistic patch behavior, and pagination growth.
- [ ] Dev-only measurements can show how many message references change across successive assemblies.
- [ ] No user-visible transcript behavior changes yet.
- [ ] Team has a baseline profile for desktop and mobile streaming before extraction starts.

---

## Phase 2: Extract Canonical Assembly Core

**User stories**: 3, 4, 8, 9, 10, 12, 13, 14, 20, 21, 22, 23, 25, 29, 31

### What to build

Extract the non-React transcript assembly logic from `useMessages` into a small React-free module set with explicit inputs and outputs. The hook becomes a thin adapter that gathers raw layers, normalizes them, and invokes the core engine. Keep the current product behavior and current provider boundaries.

Implementation details:

- Split responsibilities into mechanical modules: source normalization, base-layer trimming rules, canonical merge/precedence, lifecycle filtering, and cache-tail selection.
- Preserve the current two-step merge shape: base layers first, live layers second.
- Remove hidden policy from hook-local `useMemo` chains; the hook should mostly gather raw inputs, call pure functions, and publish results.
- Keep source-specific normalization explicit. Do not reintroduce a generic helper that hides which source arrived reversed or needed trimming.
- Avoid full-list sort on every hot-path update when deterministic append/replace logic is sufficient.

### Acceptance criteria

- [ ] The core assembly path can run in isolation with no React imports.
- [ ] `useMessages` reads as adapter/wiring code, not as the main home of merge policy.
- [ ] Existing transcript behavior remains equivalent for cache, persisted, optimistic, resumed-stream, and HTTP-stream scenarios.
- [ ] Profiling shows no regression on hot-path assembly time after extraction.

---

## Phase 3: Add Referential Stabilization And Seeded Stream Rebuild

**User stories**: 1, 3, 4, 5, 8, 15, 16, 17, 18, 19, 21, 25, 27, 28, 29, 32

### What to build

Teach the extracted engine to preserve references when visual output is unchanged, and make resumed-stream rebuilding reuse prior built state for the same stream lifecycle. This is the main upstream hot-path hardening phase.

Implementation details:

- Add a schema-aware stabilization pass after merge that can reuse prior message objects by id when the visible message is unchanged.
- Reuse unchanged `parts` arrays and unchanged `metadata` objects where safe. Replace only the rows and subtrees whose visible output actually changed.
- Exclude debug-only source tagging from production reuse decisions so debug metadata does not force clones.
- Change resumed-stream reconstruction to accept prior built message state as seed for the same stream id; reset seed when stream id changes.
- Deduplicate cache writes by comparing the cached tail contract, not by writing the last N rows on every streaming tick.

### Acceptance criteria

- [ ] Unchanged rows preserve object identity across hot-path merges.
- [ ] Unchanged message parts preserve identity when other rows change.
- [ ] HTTP-stream to persisted and cache-to-persisted handoffs stay visually identical without whole-row churn.
- [ ] Resumed-stream updates mutate only the unfinished tail for a stable stream lifecycle.
- [ ] Cache writes drop to meaningful-tail changes only.

---

## Phase 4: Harden Downstream Rendering

**User stories**: 1, 2, 5, 6, 7, 11, 16, 17, 26, 28, 29

### What to build

Once upstream identities are stable, make the render path explicitly cheap for settled rows. Keep the active tail dynamic, but stop paying streaming-oriented rendering cost for older completed content.

Implementation details:

- Introduce explicit static vs streaming rendering branches for assistant content, especially markdown-heavy rows.
- Keep layout-only tail concerns such as last-assistant min-height reserve outside message memo boundaries whenever possible.
- Adopt a one-way consolidation rule for mounted settled rows if metrics show it helps and does not break correctness.
- Ensure expensive content subtrees do not rerender when their owning message object and relevant parts are referentially stable.
- Verify the virtualized message list still benefits from stable keys, stable row props, and cheap settled rows.

### Acceptance criteria

- [ ] Completed rows remain visually calm while a new assistant tail streams.
- [ ] Markdown-heavy settled rows stop rerendering on unrelated tail updates.
- [ ] Tail-only layout behavior does not invalidate memoized settled rows.
- [ ] Virtualized list behavior remains correct for prepend, append, and streaming updates.
- [ ] Measured visible-row churn is limited mostly to the active tail.

---

## Phase 5: Conditional Granular Store Escalation

**User stories**: 6, 11, 23, 24, 27, 28, 29, 31

### What to build

Only if Phases 1-4 still miss the agreed target, introduce a local per-thread entity store that separates list ordering from per-message subscriptions. This is an escalation path, not the default architecture.

Implementation details:

- Keep the pure assembly engine as the source that computes next ordered ids plus per-id entities.
- The list layer subscribes only to ordered ids.
- Each message row subscribes only to its own message entity.
- Preserve current provider/session boundaries; do not expand this into a general chat-state rewrite.
- Reuse the same contracts and measurements from earlier phases to prove the extra complexity earns its keep.

### Acceptance criteria

- [ ] Phase 5 starts only after explicit evidence that prop-based stabilization is insufficient.
- [ ] List-level updates do not force all visible rows to receive new message props.
- [ ] Row updates are isolated to ids whose message entity actually changed.
- [ ] Store design remains hybrid and granular, not a whole-array snapshot store.
- [ ] Complexity remains bounded and documented; if gains are marginal, Phase 5 is rejected.

---

## Current Outcome

Status after upstream/downstream hardening and measurement review:

1. Phase 3 is accepted with the current safer resumed rebuild path.
2. Phase 4 is accepted with the current explicit static-vs-streaming render policy.
3. Phase 4 optional one-way settled-row consolidation is rejected for now.
4. Phase 5 granular store escalation is not justified now.

Rationale:

1. Current stabilization + render hardening already improved churn enough for the active MVP path.
2. Additional consolidation/state-latching logic would add behavior complexity without current evidence it is needed.
3. Granular entity store remains an escalation-only path and should stay blocked until fresh evidence shows prop-based stabilization is insufficient.
