# Plan: Message Merge And Reactive Store Refactor

> Source PRD: `MESSAGES_PRD.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Provider boundary**: Phase 1 may integrate the session-scoped message store provider inside the current thread-provider path. A later extraction under the AI SDK chat provider and above the thread provider remains the longer-term target.
- **Source contract**: Message sources remain React-hook-based in v1 and continue to output ordered `UIMessage[]` layers.
- **Merge boundary**: Source collection and layer merging stay outside the reactive store.
- **Store role**: The reactive store holds only the canonical merged active-message projection used for rendering.
- **Writer ownership**: There is exactly one writer to the message store: the projector/reconciler.
- **Bootstrap**: Seed the store synchronously from the first available canonical projection when possible. If full canonical seeding is too complex initially, cache-only synchronous seed is an acceptable fallback. Subsequent updates are effect-driven.
- **Scope**: Only renderable active messages belong in the canonical reactive layer. Removed messages disappear immediately.
- **Core read model**: Core reads are ids-first and slice-first. No full ordered `MyUIMessage[]` list is exposed from core.
- **Standalone path**: The standalone prop-driven `ChatMessage` path must remain valid outside store scope. Store-backed rendering stays explicit via the ids-first chat surface.
- **Virtualization**: The list consumes ordered message ids. Virtualizer classification uses non-reactive reads for immutable item facts such as role.
- **Message invariants**: Message role is immutable after creation.
- **Part invariants**: Part type is immutable. Parts are append-only, never removed, never reordered, and only the tail part may mutate.
- **Metadata semantics**: Full upstream metadata remains one coarse slice. `metadata.debug` is ignored only when explicit debug mode is off.
- **Parts semantics**: Full upstream parts remain one coarse slice in the reactive store during phase 1. Whole-array replacement on updates is acceptable.
- **Core state scope**: Core state stores only order and per-message slices. Conversation-level derived facts stay outside core.
- **Action reads**: Message-dependent actions read current message state non-reactively at execution time.
- **Validation**: Dev-only validation checks both canonical projection invariants and diff ops, and throws on broken core invariants.
- **Testing focus**: Strong tests target the pure TypeScript core. React/store integration testing stays thin.

---

## Phase 1: Cold Read Path Bootstrap

**User stories**: 1, 2, 17, 18, 20, 22, 23, 25, 31, 36, 38, 41

### What to build

Build the first end-to-end path where cold message sources can produce a canonical active-message projection, synchronously seed a session-scoped reactive store, and drive the conversation list through ordered ids plus primitive per-message reads. This slice should prove that the new store/provider boundary works for the initial stale/cached render path without requiring live streaming, optimistic overlays, or resumed-stream complexity.

### Acceptance criteria

- [ ] A session-scoped message store is created and owned by a dedicated provider at the current phase-1 integration boundary.
- [ ] The store can be synchronously seeded from the first available cold canonical projection during initial render.
- [ ] The conversation list renders from ordered message ids rather than a full ordered message array from core.
- [ ] Rows can branch by immutable role using primitive reads while virtualizer item typing can use non-reactive role access.
- [ ] Query/source pending and stale flags remain outside the message store.

---

## Phase 2: Stable Cold Updates

**User stories**: 8, 17, 20, 21, 24, 31, 32, 33, 34, 35, 44

### What to build

Extend the cold read path so subsequent cold-source changes flow through canonical normalization, previous-vs-next diffing, and minimal store writes. This slice should prove that metadata and order changes can be applied without churning unrelated message nodes, and that the store boundary is the place where ref stability is enforced.

### Acceptance criteria

- [ ] The merged canonical message list is normalized into a diff-friendly shape before projection.
- [ ] A previous canonical snapshot is retained beside the projector and used as the primary diff baseline.
- [ ] Metadata-only changes do not rewrite parts.
- [ ] Order changes update only the ordered id list and preserve unchanged message node identity.
- [ ] Canonical baseline advances even when a processed diff emits no store ops.
- [ ] Metadata comparison ignores `metadata.debug` only when explicit debug mode is off.

---

## Phase 3: Hot HTTP Streaming Path

**User stories**: 3, 7, 9, 10, 28, 29, 37, 42

### What to build

Wire the direct live HTTP streaming source into the same projector/store pipeline so the active assistant message updates through the new reactive store instead of broad React message-array churn. This slice should prove that tail-only streaming updates can drive content-heavy UI with narrower reactivity than the current architecture.

### Acceptance criteria

- [ ] Live HTTP stream updates flow into the same canonical merge and projector path as cold sources.
- [ ] Part reconciliation respects append-only and tail-only mutation semantics.
- [ ] Content consumers can subscribe narrowly enough that metadata changes do not force markdown-heavy rerenders.
- [ ] Text/reasoning filtering can be built later in L3 on top of the coarse full parts slice without changing the core store API.
- [ ] Projector writes are applied in immediate batches after render, without introducing a second defer/throttle layer.

Current phase 3 progress notes:

- Source-aware cold/hot diff semantics are implemented in the pure TS diff engine.
- Dev-only invariant validation is implemented and wired into the provider.
- Remaining phase 3 work should focus on broader hot-path integration confidence and any further streaming-specific behavior needed beyond the current reconciler semantics.

---

## Phase 4: Resumed Stream Path

**User stories**: 5, 7, 17, 18, 20, 29

### What to build

Adapt the resumed streaming path so it continues to reconstruct normal `UIMessage[]` source output but now feeds the same canonical merge, diff, and store pipeline as every other source. This slice should prove that resumed streaming does not need a second rendering architecture and can benefit from the same projection and reactivity model.

### Acceptance criteria

- [x] The resumed stream source still exposes normal ordered `UIMessage[]` output.
- [x] The resumed path feeds the same layering engine and projector path as the cold and HTTP stream paths.
- [x] Tail streaming updates in resumed mode obey the same append-only/tail-only invariants.
- [x] No separate message rendering contract is introduced for resumed streaming.
- [x] The resumed path is covered by pure TypeScript tests at the merge/projector level.

Current phase 4 progress notes:

- Resumed reconstruction is extracted into a pure adapter module and the hook now acts as a thin bridge.
- The current Convex chunk query/cursor behavior is preserved.
- Resumed output still uses the same `MyUIMessage[]` contract and the same merge/project/store/render path.
- Pure TS tests cover resumed adapter behavior and resumed-source hot diff semantics.

---

## Phase 5: Optimistic Overlay And Action Reads

**User stories**: 3, 4, 14, 19, 39, 40, 43

### What to build

Bring optimistic overlays and message-dependent thread actions into the new architecture. This slice should prove that optimistic message layers can merge into the canonical projection cleanly and that actions such as regenerate/retry can read current message state from the store non-reactively at execution time without reintroducing broad subscriptions.

### Acceptance criteria

- [x] Optimistic message overlays participate in the same ordered layer merge as other sources.
- [x] Optimistic-to-persisted transitions reconcile through the projector/store path without broad node churn.
- [x] Thread-level actions can read current message state via non-reactive store access at execution time.
- [x] The thread provider no longer owns message merge/projection responsibilities.
- [x] The store remains single-writer despite optimistic and action-driven flows.

Current phase 5 progress notes:

- `useMessages` and `MessagesStoreProvider` are now owned by a dedicated message-pipeline provider instead of `ActiveThreadProvider` directly.
- `ActiveThreadProvider` now consumes pipeline outputs and store peeks rather than owning message merge/projection.
- Regenerate selection is extracted into a pure helper and thread-level regenerate now traverses current store state via specific non-reactive peek helpers.
- Pure tests cover regenerate selection logic and optimistic-to-persisted node identity preservation.

---

## Phase 6: Dev Invariants And Cleanup

**User stories**: 26, 27, 28, 29, 30, 43, 44, 45

### What to build

Finalize the architecture by adding explicit dev-only invariant validation and locking the new structure in with strong pure-TypeScript tests plus a thin reactive integration proof. This slice should leave the message system with enforced invariants, clear ownership, and a maintainable long-term shape.

### Acceptance criteria

- [x] Dev-only validation checks both canonical projection invariants and projector diff ops.
- [x] Broken core invariants throw in development.
- [x] The strongest automated coverage targets the pure TypeScript core modules: layering, normalization, diff/projector behavior, and validation.
- [x] A lightweight reactive integration test proves that intended slices update through the store boundary without broad unnecessary churn.
- [x] Legacy message ownership responsibilities are removed from the thread-level provider path.

Current phase 6 progress notes:

- Dev-only canonical and diff-op validation is implemented and wired into the provider.
- Pure TS coverage now spans merge, normalization, diff/projector behavior, validation, resumed reconstruction, regenerate selection, and store identity behavior.
- A single jsdom-based reactive integration test proves that metadata-only updates do not rerender parts subscribers and parts-only hot updates do not rerender metadata subscribers.
- Message merge/projection ownership is out of `ActiveThreadProvider`; it now consumes a dedicated message-pipeline provider.
