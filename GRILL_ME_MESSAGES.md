# Grill Me Log

Append-only takeaways from the frontend message merge/perf design interview.

## 2026-04-14

### Initial context

- Current hot/cold source split already exists in `apps/web/src/hooks/use-messages.tsx`.
- Sources: cache, persisted, optimistic, resumed stream, HTTP stream.
- Main unresolved perf concern is not broad merge correctness anymore; it is render churn from same-ish messages getting new refs.
- Desired behavior: when merging overlapping sources, unchanged logical messages should ideally preserve refs; only truly changed slices should update.

### Codebase observations

- `mergeMessageLayers()` currently overwrites message refs by id collision.
- `withDataSource()` clones messages to stamp debug provenance, creating extra ref churn.
- Resumed stream reconstruction recreates a fresh `MyUIMessage` from chunks repeatedly.
- Current render path still passes `MyUIMessage[]` into list components, then passes whole `message` objects into rows.

### Design direction discussed

- Narrow external message store looks promising; not a full app store.
- Conversation-level state/actions can remain in React/context.
- Message layer is the candidate boundary for granular subscriptions.
- First proposed split was ids-based list plus message selectors/hooks.

### User constraints clarified

- Avoid granularity creep.
- Must at least decouple heavy content consumers from unrelated metadata churn.
- Need content reactivity at least by "part types I care" vs "part types I do not care".
- Non-part props can stay coarser; metadata-wide rerender is acceptable for metadata consumers.
- Row-level split one level deeper is acceptable.

### User concerns raised

- Diverging too far from `UIMessage` shape risks large refactor cost because existing UI and ai-elements-derived components assume that contract.
- Explicitly splitting stored parts by type is wrong because global part order matters.
- Metadata should remain semantically metadata; moving it conceptually out of the message is undesirable.

### Refined recommendation

- Keep the canonical per-message shape close to `UIMessage`.
- Preserve global `parts` order as a single ordered array; do not physically split parts by type in storage.
- Preserve `metadata` as message metadata.
- Granularity should come from selectors/subscriptions, not from mutating the message schema into many semantic fragments.
- Likely useful selector set:
  - ordered message ids for the list
  - full `UIMessage` compatibility selector for low-risk migration paths
  - filtered ordered parts selector for heavy content paths
  - metadata selector for footer/status/light UI
- Row-level split should happen one level deeper so content-heavy subtrees can subscribe separately from metadata-heavy subtrees.

### New clarifications

- User asked whether selector API should look like a standard Zustand selector function instead of a custom `{ include: [...] }` options object.
- User asked whether per-message hooks/subscriptions are actually as performant as passing `UIMessage` refs via props.
- User clarified temporary `MyUIMessage` compatibility can exist as a migration aid but should not drive the core architecture design.
- Current design should optimize around the future granular structure first, not around the temporary compatibility layer.

### Decisions made

- Selector-style API is acceptable/preferred as the low-level primitive.
- Any compatibility `useMessage(messageId) -> MyUIMessage` hook should be temporary and not shape the core architecture.
- Canonical store should stay minimal and close to `UIMessage`:
  - `id`
  - `role`
  - ordered `parts`
  - `metadata`
- Part-type filtering should be derived by selectors, not encoded into the canonical store.
- User preference currently leans toward Legend-State over Zustand, but wants a side-by-side comparison applied to this exact problem before deciding.

### New decisions

- Current direction: try Legend-State first.
- Public message-store API should still feel controlled; user does not want store choice leaking too aggressively everywhere.
- User is unsure about adopting Legend-specific `For` / `Memo` patterns because message list rendering already uses a virtualizer (`LegendList`).

### Session scoping decision

- Store should effectively be scoped to `ChatSessionScope`.
- If multiple activities/sessions are intentionally kept alive in memory while hidden, their message stores may stay alive too by design.
- Otherwise store lifetime should end with the owning scope/provider so memory is freed naturally.
- User concern: avoid unbounded memory retention from long-lived global stores.

### Merge boundary decision

- Agreed pipeline direction:
  - data sources
  - layering logic
  - data store
  - granular reactive components
- Source layering/merge semantics should stay outside the reactive store.
- Store should hold the canonical merged projection, not the full source-aware merge engine.

### Part granularity concern

- User wants to understand how fine-grained patching actually avoids notifying unrelated listeners.
- Concrete example raised: stale `message1` becomes persisted `message1` with one metadata change and one last-text-part change; only listeners of those changed slices should react.
- Codebase observation: message part ids are not guaranteed today. `apps/web/src/components/chat/message/_parts/content.tsx` falls back to `${type}-${index}` when `part.id` is absent.
- Implication: true per-part patching needs either guaranteed stable part ids or an internal matching heuristic/fallback with reduced guarantees.

### New decision

- User accepts internal-only normalization of parts as `partOrder + partsByKey`, while public selectors may still expose ordered `parts[]` / `MyUIMessage`-compatible snapshots.
- User concern: manual diffing to know what to update in store feels scary; wants an elegant and performant pattern for minimal updates.

### New question branch

- User asked whether a store like Zustand could avoid most reconciliation work by replacing the whole message at the same key and relying on granular selectors/equality to skip rerenders for unchanged selected slices.
- User recognizes parts stability likely still matters either way.
- User answer on part ids: current parts are ordered and have no ids; undecided whether internal stable part keys should become an invariant.

### Streaming parts invariant

- User clarified the critical parts invariant:
  - parts are append-only
  - once a part is added it is never removed
  - only the tail part may continue updating
  - once a part is no longer tail, it becomes immutable
- Implication: arbitrary per-part ids may be unnecessary; stable index may be enough as the internal identity for live reconciliation.

### New decision

- Hard invariant accepted for canonical layer: parts may only append or mutate tail.
- Any middle mutation/reorder should be treated as a bug and warned in dev.
- Internal keyed part map likely unnecessary under this invariant; indexed append/tail reconciliation is preferred.

### Public read API decision

- Core store API should expose primitive hooks/selectors only.
- Domain-specific hooks should live on top in L3 feature `_hooks`.
- Avoid a large central view-model hook at the core store boundary.

### Write ownership decision

- Only the core layering logic should write to the Legend store.
- Source hooks should not mutate the store independently.
- Preferred shape is a single projector/reconciler per `ChatSessionScope`.

### Structural split decision

- `useMessages` should be split.
- Desired seams:
  - source collection hook
  - pure layering engine
  - projector/reconciler-to-store hook
  - primitive read hooks

### Projection strategy decision

- Start with full canonical recompute from current source snapshots.
- Diff against previous canonical projection before writing to the store.
- Do not start with a more complex incremental source-driven state machine.

### Diff baseline decision

- Projector should keep the previous canonical projection in a local ref.
- Do not use current reactive store state as the primary diff baseline.
- Dev assertions comparing projector snapshot vs store can be optional later, not the main mechanism.

### Core read boundary decision

- Core primitive read API must not expose a full ordered `MyUIMessage[]` list.
- Core should stay ids-first and slice-first.
- Any compatibility adapter returning full message snapshots must remain outside the core path and be treated as transitional only.

### Virtualizer constraint

- `MessagesListVirtual` / `LegendList` currently needs item type classification (`getItemType`) for virtualization behavior.
- User noted this may require at least a non-reactive way to inspect current message role from list items/store.
- This slightly weakens the earlier pure ids-only list contract and needs an explicit design choice.

### New decision

- Keep list data as ordered message ids.
- Use non-reactive store reads (e.g. Legend `peek()`) for virtualizer plumbing such as `getItemType`.
- `message.role` is a hard immutable invariant after creation.

### Source shape decision

- User prefers all message providers/sources to output arrays of full `UIMessage`/`MyUIMessage` values.
- Merge/layering logic should continue to operate on ordered layers of `UIMessage[]`.
- Store projector/reconciler should consume the merged canonical `UIMessage[]` projection and decide the minimal store updates.
- Implication: source-level full-message reconstruction churn is acceptable as long as the projector diff prevents broad reactive churn downstream.

### Metadata/debug decision branch

- User is open to keeping `debug`, `timing`, and `usage` inside `metadata` rather than splitting sub-objects out.
- Desired behavior: metadata remains one coarse slice; no sub-property granular updates inside metadata.
- Proposed rule: projector diff may ignore `metadata.debug` entirely unless an explicit debug mode is enabled.
- Implication: when debug mode is off, provenance/debug churn should not affect metadata consumers.

### New decision

- Metadata comparison policy should ignore only `metadata.debug` when explicit debug mode is off.
- `timing` and `usage` remain part of normal coarse metadata semantics for now.

### Core primitive API v1

- Core read API should include at least:
  - `useMessageIds()`
  - `useMessageRole(messageId)`
  - `useMessageMetadata(messageId)`
  - `useMessageParts(messageId)`
  - `peekMessageRole(messageId)` or equivalent store-api access for virtualizer plumbing

### Selector primitive decision

- L3 domain hooks needing narrower subscriptions should build on a generic selector primitive rather than pulling full parts and filtering in React.
- Preferred direction: add a core `useMessageSelector(messageId, selector)` primitive.

### Clarification branch

- User did not yet decide what selector input shape `useMessageSelector` should expose and asked for clarification.

### New decision

- User is okay with Legend-State leaking at the core store boundary.
- Core selector hooks may expose true Legend-State mechanisms directly.
- Any further abstraction behind domain-shaped L3 hooks is optional and can be added later, but is not a core requirement now.

### New invariant

- `part.type` is a hard immutable invariant.

### Selector specialization decision

- Start with generic Legend-native selectors/hooks for part filtering.
- Do not start with specialized invariant-aware selector helpers.
- Add specialized helpers later only if profiling shows selector work is still material.

### Write timing preference

- User preference: initial stale cached data should appear ASAP.
- Further updates may be delay-tolerant in theory, but user does not want extra feature creep now.
- Safe starting choice is immediate batched writes rather than adding another defer/throttle layer.

### Projector execution decision

- Projector/reconciler should run in an effect reacting to source snapshots.
- Do not mutate the external Legend store during render.
- Keep scheduling simple in v1; no extra custom scheduling layer yet.

### Store bootstrap decision

- Start Legend store empty on first mount, then fill it from the projector effect.
- Do not add a special synchronous bootstrap/seeding path in v1.
- Keep a possible future seeding path in mind if empty-to-filled transition is visually unacceptable for cached stale data.

### Dev invariant checks decision

- Add dev-only invariant checks for agreed contracts.
- Checks should not pollute the core reconciler logic with framework-heavy complexity.
- Preferred shape: separate dev-only validator/plugin layer around or beside the reconciler/projector.

### Dev validation scope decision

- Validate both:
  - next canonical projection invariants
  - produced diff ops against `prev -> next`

### Testing scope decision

- V1 testing should focus primarily on pure TypeScript logic.
- Minimum test focus:
  - merge/layering engine behavior
  - projector diff behavior (`prev canonical -> ops`)
  - reconciler invariant validation
  - one lightweight reactive/store integration test

### Projector snapshot shape decision

- Projector should normalize merged `MyUIMessage[]` output into a diff-friendly shape for previous-state tracking.
- Preferred snapshot shape:
  - `order: string[]`
  - `byId: Record<string, CanonicalMessage>`
- Diffing should not repeatedly scan ordered arrays as the primary baseline structure.

### Canonical scope decision

- Canonical projection/store should include only renderable active messages in v1.
- Do not retain archived/deleted messages in the reactive canonical layer for now.

### Core state scope decision

- Core message store should preserve only message-level order and message slices.
- Do not cache conversation-level derived facts like last assistant / last streaming message in core state for v1.
- Keep those as derived logic in L3/domain hooks.

### Bridge / initial load concern

- User raised a major concern about the React-hook-to-external-store bridge shape.
- Current sources are React-reactive hooks (`useChat`, query hooks, cache hooks, etc.), so a projector effect introduces an extra indirection compared to current direct render derivation.
- Main UX concern: effect-driven store population can cause a first paint before the initial store value is set, which is especially undesirable for initial stale cached data.
- Long-term possibility exists to move more reactivity outside React, but that is explicitly considered much larger scope because current source hooks are already complex and mature.
- This concern may justify a future synchronous initial seeding path even if subsequent updates stay effect-driven.

### Revised bootstrap requirement

- Initial store population must have a synchronous path.
- Preferred shape: seed the store synchronously from the first available canonical projection, then use effect-driven projector updates afterward.
- At minimum, synchronously seeding from current cached value (if any) would be acceptable.
- This is considered an important UX requirement, not scope creep.

### New decision

- Preferred initial seeding strategy:
  - try to synchronously seed from the full first canonical projection available during render
  - fallback to cache-only synchronous seed if full canonical seeding proves too complex for v1

### Provider placement decision

- Introduce a dedicated `MessagesStoreProvider`.
- Place it under `AiSdkChatProvider` and above `ActiveThreadProvider`.

### ActiveThreadProvider role decision

- `ActiveThreadProvider` should stop owning message derivation/merge/project/store concerns.
- It should focus on thread-level state/actions only.
- Message-dependent actions (example: regenerate) may still read from the message store, likely via non-reactive reads when appropriate.

### Action read decision

- Message-dependent actions should read current message data non-reactively at execution time.
- `peek()` / store-api access is preferred for these action paths.
- This avoids subscription churn and stale render-time snapshots.

### Store mutation boundary decision

- Preserve a single writer.
- Message store layer should expose read hooks and non-reactive peek/store-api helpers only.
- All mutations remain strictly inside the projector/reconciler path.

### Dev invariant failure behavior

- Broken core invariants should throw in dev.
- Do not silently warn-and-continue for impossible/core contracts.

### Identity preservation decision

- Preserve per-message node identity for unchanged messages even when global order changes.
- Order updates should touch the ordered id list, not unrelated message slices/nodes.

### Order primitive decision

- Keep a dedicated `useMessageIds()` primitive even though generic selector mechanisms also exist.
- Treat message order as a special top-level slice with an explicit API.

### V1 history scope decision

- Older paginated loaded history should live in the same message store path as recent messages in v1.
- Do not add an extra colder internal storage tier for older pages yet.

### Removal semantics decision

- If a message disappears from the merged active canonical projection, remove it from store/order immediately in v1.
- Do not add soft-retain/debug retention behavior in the canonical reactive layer.

### PRD transition

- We have enough resolved architecture to move into PRD writing.
- No separate synthesis step is required before the PRD; the PRD itself should become the synthesis.
- Remaining clarification focus before drafting PRD: confirm intended module boundaries and testing targets.

### Agreed module boundaries

- The following proposed core modules match user expectations:
  - message source collector
  - message layering engine
  - canonical normalizer
  - message projector / diff engine
  - Legend message store
  - messages store provider / React bridge
  - core read API
  - dev validator
  - L3 domain hooks / adapters

### Testing target decision

- V1 should strongly test all pure TypeScript core parts.
- User agrees with strongest focus on:
  - message layering engine
  - canonical normalizer
  - message projector / diff engine
  - dev validator
- React components do not need heavy direct testing for this PRD.

### Legend-State audit branch

- User challenged whether the current Legend-State store shape is truly idiomatic.
- Codebase audit + local Legend-State skill/source review found:
  - pure TS core extraction is good and remains valid
  - the current Legend integration uses a more unusual internal shape than the original conceptual model
  - `observable(parts)` for the rich message parts type appears to be a poor fit for v3 beta TypeScript
  - a coarse-leaf approach is defensible in Legend, but it increases conceptual weirdness
- Current partial Legend store shape in code uses:
  - `orderedIds$`
  - `messagesById: Map<string, MessageNode>`
  - `role$`
  - `metadata$`
  - raw `parts` plus `partsVersion$`
- Current concern is no longer only performance. It is now also maintainability / architecture clarity / team confidence.

### Reduced store-type branch

- User asked whether recursive Legend typing could be bypassed by intentionally storing a smaller/coarser type rather than the full original rich type.
- Distinction clarified:
  - bad: lying cast through `unknown` while pretending to store the same full type
  - acceptable: explicit, documented store-specific reduced type with controlled input/output conversion
- User is open to the reduced-type approach if it is documented and all store input/output boundaries are controlled.
- New decision: for the Legend-backed render store, phase 1 may store an explicit reduced render-parts union limited to currently rendered part kinds (`text | reasoning`) instead of full upstream `MyUIMessage["parts"]`.
- If unsupported part kinds appear in phase 1, store conversion should drop them but emit a dev warning.

### Parts granularity clarification

- User noticed `observablePrimitive(parts)` changes mutation semantics: it supports coarse whole-slice replacement, not convenient direct per-item observable mutation.
- User clarified the desired granularity floor is the full part, not below a part.
- User is currently okay with replacing the full parts slice on updates if that keeps the model simpler.
- More granular append/update-at-tail behavior remains desirable long-term, but is not required if it complicates phase 1 too much.
- New decision: for now, `parts` may be treated as one coarse reactive leaf slice and replaced as a whole on updates.
- New decision: drop the reduced render-parts store boundary for now and type the coarse `parts` observable leaf with the full upstream parts type directly.
- New decision: drop the reduced render-model entirely for phase 1 and keep full upstream message semantics, with coarse leaf observables for full `metadata` and full `parts`.
- Core minimum goal clarified: the essential improvement is stable role + separate coarse subscriptions for `parts` and `metadata`; that is sufficient to unlock the desired next steps.
- Hard clarification: the message UI should not reconstruct a combined message object on the render path. Each subtree must read only the slice it actually needs from the store.

### Action plumbing clarification

- Existing `readRawText` helper is only for current copy/edit/retry action plumbing, not part of the desired core architecture.
- The main refactor target remains render subscription architecture, not new action features.
- Current decision: keep actions simple for now, but provide a way to non-reactively peek text parts for copy/paste style actions.
- New decision: the store API should expose non-reactive peek helpers for action use, starting with message parts and optionally metadata.

### 2.5 Cleanup Decisions

- Prop-driven `ChatMessage` must remain usable outside `MessagesStoreProvider`.
- Store-backed rendering stays explicit via `ChatMessageStoreItem`.
- Standalone message actions may receive an explicit raw-text reader override instead of implicitly depending on the store.
- Projector baseline must advance to the latest canonical snapshot even when emitted diff ops are empty.

### Filtered parts hook decision

- Reactive filtered selectors over the coarse full `parts` slice are desired.
- Part-type filtering does not need to become a lower-level Legend granularity concern.
- Decision: filtered helpers such as `useMessagePartsByType(messageId, "text")` should live in L3/domain hooks, not in the core store API.

### Core API boundary decision

- Core store API should expose explicit primitives only.
- Decision: do not keep a generic `useMessageSelector` in core.
- Core primitives should remain focused on `role`, `metadata`, `parts`, ordered ids, and specific non-reactive peek helpers.
