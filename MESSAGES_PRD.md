## Problem Statement

The chat frontend currently builds its final `MyUIMessage[]` render input by merging multiple message sources with different freshness and update characteristics. Those sources include local cache, persisted finalized messages, optimistic overlays, resumed stream state, and direct HTTP stream state. The current merge path already separates hot and cold inputs and already includes some optimizations, but the final output still suffers from significant reference churn and overly broad React re-rendering.

From the user/developer perspective, the key problem is not basic merge correctness anymore. The main issue is that messages that are logically unchanged are frequently reconstructed with new references, and updates that should be narrow, such as metadata changes or tail-stream text changes, still wake rendering work far beyond the UI that actually depends on those changes. This is particularly expensive because message content rendering is heavy, with markdown and reasoning/text part rendering in each message row.

The current design keeps message rendering in React state/context shape, which makes it hard to decouple content-heavy message part consumers from unrelated metadata churn. It also makes it hard to preserve stable message and part identity across transitions between cache, persisted, optimistic, resumed-stream, and HTTP-stream data. The resumed-stream reconstruction path adds more churn because it repeatedly rebuilds full UI messages from streaming chunks.

The desired outcome is a frontend message architecture that preserves correctness while significantly reducing unnecessary render work. Message content consumers should react only to the message parts they care about. Metadata consumers should react to metadata changes without forcing markdown-heavy content rerenders. Source-level message reconstruction churn should stop mattering after the projector/store boundary. The system should stay testable, mostly in pure TypeScript, and should preserve good initial stale-data UX.

## Solution

Introduce a session-scoped, Legend-State-backed reactive message entity layer that sits after the existing source collection and message layering logic, without moving source reactivity out of React in v1.

All sources continue to produce arrays of full `UIMessage`/`MyUIMessage` values. A pure TypeScript layering engine merges ordered source layers into one canonical active-message projection. That merged projection is normalized into a diff-friendly shape and compared against the previous canonical projection. A pure TypeScript projector/diff engine emits only the minimal message-store write operations required to update the reactive store while preserving identity for unchanged slices.

The new reactive store is scoped to the chat session lifecycle and holds only the canonical active message entity state required for rendering: ordered message ids, immutable message role, coarse metadata, and ordered parts. The store does not own source layering semantics, pending/loading/stale query state, or user actions. It is single-writer only: the projector/reconciler is the only code allowed to mutate it.

The React bridge is hybrid. On first mount, the store must be seeded synchronously from the first available canonical projection when possible, with a cache-only seed allowed as a fallback if full canonical seeding is too complex for v1. After bootstrap, updates are applied through an effect-driven projector path that batches writes immediately. This avoids an empty first paint for cached stale data while preserving a clean update model.

UI consumption becomes ids-first and slice-first. The list consumes ordered message ids. Rows branch by immutable role. Content, footer, and status consumers subscribe to only the slices they need through primitive read hooks and Legend-native selector mechanisms. Virtualizer plumbing uses non-reactive reads such as `peek()` for immutable classification like message role. Domain-specific hooks may be built on top later, but the core API may expose Legend-State mechanisms directly.

This solution keeps the source contract simple, isolates most complexity in pure TypeScript deep modules, preserves current message semantics, and directly targets the remaining frontend performance problems: non-granular updates and same-ish message reference churn.

## User Stories

1. As a chat user, I want cached stale conversation messages to appear immediately when I open a chat, so that the interface feels instant.
2. As a chat user, I want persisted messages to replace stale cached messages without visually rerendering the entire conversation unnecessarily, so that the interface feels stable.
3. As a chat user, I want optimistic messages to appear immediately while sending, so that interactions feel responsive.
4. As a chat user, I want optimistic overlays to reconcile into persisted messages smoothly, so that I do not see unnecessary visual churn.
5. As a chat user, I want resumed streaming conversations to continue updating correctly, so that leaving and returning to a chat does not break the active assistant message.
6. As a chat user, I want HTTP-streamed assistant messages to update smoothly while tokens arrive, so that streaming feels live and stable.
7. As a chat user, I want message content rendering to stay smooth while the assistant streams, so that long markdown responses do not feel janky.
8. As a chat user, I want metadata updates such as timing, usage, or model info to update without making message content visibly re-render, so that the interface feels efficient.
9. As a chat user, I want reasoning content updates to avoid disturbing unrelated text-only UI where possible, so that rendering work stays focused.
10. As a chat user, I want text content updates to avoid disturbing unrelated metadata-only UI where possible, so that the chat feels stable.
11. As a chat user, I want older paginated messages to coexist with recent ones in one conversation view without special-case bugs, so that scrolling through history remains reliable.
12. As a chat user, I want removed messages to disappear immediately when they are no longer part of the active canonical conversation, so that I only see the current truth.
13. As a chat user, I want conversation order changes to avoid disturbing unchanged message content, so that the UI does not feel like it is rebuilding everything.
14. As a chat user, I want regenerate and retry actions to operate on the freshest current messages, so that actions always target the correct conversation state.
15. As a chat user, I want hidden chat sessions that are intentionally kept alive to preserve their current message state, so that returning to them feels seamless.
16. As a chat user, I want unmounted chat sessions to release memory, so that keeping multiple chats open does not grow memory forever.
17. As a frontend engineer, I want message-layer complexity isolated in pure TypeScript modules, so that the core logic is easy to test and evolve.
18. As a frontend engineer, I want all message sources to continue producing full `UIMessage[]` values, so that source integrations remain consistent.
19. As a frontend engineer, I want the merge/layering engine to remain source-agnostic, so that each source can be reasoned about independently.
20. As a frontend engineer, I want the projector to own diffing and store writes, so that downstream stability is controlled in one place.
21. As a frontend engineer, I want the message store to have one writer only, so that ordering, correctness, and debugging remain tractable.
22. As a frontend engineer, I want the reactive store scoped to the chat session lifetime, so that state ownership matches provider lifetime.
23. As a frontend engineer, I want the store to expose primitive read APIs only, so that the core remains small and reusable.
24. As a frontend engineer, I want L3 feature hooks to build on primitive reads, so that feature-specific derivations stay close to feature code.
25. As a frontend engineer, I want the list layer to consume message ids instead of full message objects, so that top-level rendering depends on less data.
26. As a frontend engineer, I want virtualization plumbing to classify items without reactive subscriptions, so that layout logic does not create unnecessary render churn.
27. As a frontend engineer, I want message role to be immutable after creation, so that row branching and virtualizer classification remain simple.
28. As a frontend engineer, I want part type to be immutable, so that part-type-specific selectors can rely on stable semantics.
29. As a frontend engineer, I want parts to follow append-only and tail-only mutation invariants, so that part reconciliation stays simple and fast.
30. As a frontend engineer, I want middle-part mutation, reorder, and removal to fail loudly in development, so that performance assumptions never silently rot.
31. As a frontend engineer, I want metadata to remain one coarse semantic slice, so that the data model stays understandable.
32. As a frontend engineer, I want debug provenance to stay inside metadata semantically, but to be ignored in non-debug comparison mode, so that debug churn does not poison normal UI behavior.
33. As a frontend engineer, I want unchanged message nodes to preserve identity even when the global order changes, so that sibling rows do not rerender unnecessarily.
34. As a frontend engineer, I want the projector to recompute from full source snapshots in v1, so that the system is correct and easy to reason about before any incremental optimization.
35. As a frontend engineer, I want the previous canonical projection stored in a diff-friendly normalized shape, so that diffs are explicit and linear.
36. As a frontend engineer, I want the first store seed to happen synchronously when possible, so that initial stale data is visible without an extra paint delay.
37. As a frontend engineer, I want subsequent store updates applied in immediate batches, so that freshness is preserved without introducing more scheduling complexity.
38. As a frontend engineer, I want to keep query and source lifecycle flags outside the message entity store, so that the store does not become a second conversation app-state layer.
39. As a frontend engineer, I want the `ActiveThreadProvider` to focus on thread concerns instead of message merge concerns, so that provider boundaries become clearer.
40. As a frontend engineer, I want message-dependent actions to perform non-reactive store reads at execution time, so that actions see fresh data without creating render subscriptions.
41. As a frontend engineer, I want a dedicated order primitive in the read API, so that message order remains explicit and performance-sensitive code stays standardized.
42. As a frontend engineer, I want a generic Legend-native message selector primitive, so that L3 hooks can subscribe narrowly where needed.
43. As a frontend engineer, I want pure TypeScript invariant validation around canonical projections and diff ops, so that projector bugs are detected before they leak into UX.
44. As a frontend engineer, I want most tests to target pure TypeScript behavior rather than React component internals, so that tests remain durable and valuable.
45. As a frontend engineer, I want the architecture to remain compatible with future seeding improvements or future non-React source reactivity, so that v1 does not trap the system in a dead-end.

## Implementation Decisions

- Keep all current message sources producing arrays of full `UIMessage`/`MyUIMessage` values.
- Keep source collection and source-specific reactivity in React hooks for v1.
- Continue separating hot and cold sources at the source/layering level where already useful.
- Introduce a dedicated message source collector module to gather normalized source layers and relevant non-message source flags.
- Introduce a pure TypeScript message layering engine that merges ordered `UIMessage[]` layers into one canonical active-message projection.
- Introduce a pure TypeScript canonical normalizer that converts the merged message list into a diff-friendly shape with message order and message lookup by id.
- Introduce a pure TypeScript projector/diff engine that compares previous canonical projection vs next canonical projection and emits minimal write operations.
- Use one previous canonical snapshot stored beside the projector as the diff baseline.
- Do not use current reactive store state as the primary diff baseline.
- Start with full canonical recomputation from current source snapshots on each update.
- Do not start with a more complex incremental source state machine.
- Keep source layering logic outside the reactive store.
- Keep the reactive store as the canonical merged projection only.
- Use Legend-State as the reactive store technology for v1.
- Scope the store to the chat session lifetime.
- If a session is intentionally kept alive while hidden, its store may remain alive by design.
- If the owning session scope unmounts, the store should be freed naturally.
- Place the new messages store provider under the AI SDK chat provider and above the thread provider.
- Remove message derivation responsibilities from the thread provider.
- Keep the thread provider focused on thread-level state and actions.
- Allow thread-level actions such as regenerate to read current messages via non-reactive store access at execution time.
- Preserve a single writer to the message store.
- Expose read hooks and non-reactive peek/store helpers from the store layer, but no public mutation actions.
- Seed the store synchronously on initial mount from the first available canonical projection when possible.
- If full canonical synchronous seeding is too complex initially, allow cache-only synchronous seeding as a fallback.
- Apply subsequent projector updates in an effect after render.
- Batch update writes immediately in v1.
- Do not add a second defer/throttle layer for projector writes in v1.
- Keep canonical/store scope limited to renderable active messages only.
- Do not retain archived or deleted messages in the reactive canonical layer in v1.
- Remove messages immediately if they disappear from the merged active canonical projection.
- Keep only message order and per-message slices in core store state.
- Do not cache conversation-level derived facts such as last assistant or last streaming message in core store state.
- Keep pending/loading/stale query flags outside the message store.
- Preserve `metadata` as one coarse semantic slice.
- Keep `timing`, `usage`, and `debug` inside metadata semantically.
- Do not split metadata into more reactive sub-objects in v1.
- Ignore only `metadata.debug` when comparing metadata while explicit debug mode is off.
- Include debug in metadata comparison when debug mode is on.
- Treat message role as immutable after message creation.
- Treat part type as immutable.
- Enforce the canonical parts invariant: parts are append-only, never removed, never reordered, and only the tail part may mutate.
- Treat middle-part mutation, removal, or reorder as a developer bug.
- Because parts follow append-only/tail-only rules, internal keyed part maps are not required in v1.
- Reconcile parts by ordered index with append and tail-update semantics.
- Preserve per-message identity for unchanged messages even when message order changes elsewhere.
- Keep a dedicated `useMessageIds()` primitive in the core read API.
- Core read API should include at least primitives for message ids, message role, message metadata, message parts, and non-reactive role peeking for virtualizer use.
- Add a generic Legend-native `useMessageSelector(messageId, selector)` primitive for narrower subscriptions.
- Allow core selector APIs to expose Legend-State mechanisms directly.
- Domain-specific hooks may be added in feature code on top of these primitives later, but are not a required abstraction boundary for v1.
- Keep older paginated message history in the same message store path as recent messages in v1.
- Use non-reactive reads such as `peek()` for virtualizer item typing and for action execution-time reads.
- Add a dev-only validator layer around canonical projections and diff ops.
- Keep validation logic separate from the core reconciler implementation rather than polluting core logic.
- Validate both the next canonical projection invariants and the produced diff operations.
- Throw in development when core invariants are broken.

## Testing Decisions

- Favor tests of external behavior and stable contracts over implementation details.
- The strongest test focus in v1 should be the pure TypeScript core modules, because they hold the architecture’s main correctness and performance assumptions.
- Strong unit tests should cover the message layering engine.
- Strong unit tests should cover the canonical normalizer.
- Strong unit tests should cover the projector/diff engine.
- Strong unit tests should cover the dev validator behavior.
- Tests should prove that unchanged messages preserve identity through diffs.
- Tests should prove that metadata-only changes do not emit part updates.
- Tests should prove that part tail updates do not rewrite earlier parts.
- Tests should prove append-only part behavior.
- Tests should prove immediate message removal when absent from canonical projection.
- Tests should prove that order changes do not churn unchanged message nodes.
- Tests should prove metadata debug comparison policy, including ignoring debug only when debug mode is off.
- Tests should prove that invalid canonical inputs or invalid diff outputs throw in development.
- Add one lightweight reactive integration test around the store/provider boundary to verify that intended slices update without broad unnecessary churn.
- Do not invest heavily in direct React component tests for this PRD unless a component boundary proves unusually risky.
- Good tests in this area should validate visible behavior and store/public contracts rather than internal implementation structure.

## Out of Scope

- Rebuilding all source reactivity outside React.
- Replacing `useChat`, query hooks, cache hooks, or other existing source providers with non-React reactive infrastructure in v1.
- Making the message store a general conversation state manager.
- Moving pending/loading/stale query state into the message store.
- Storing archived or deleted messages in the canonical reactive layer.
- Adding conversation-level derived caches such as last assistant or last streaming message to core state.
- Adding more granular metadata sub-slice reactivity.
- Ignoring timing or usage in normal metadata comparison.
- Adding a generic deep-diff engine.
- Adding a second colder internal storage tier for older paginated history.
- Adding soft-retention or transition lifecycles for removed messages.
- Adding specialized invariant-aware selector helpers before profiling proves they are needed.
- Building a broad abstraction layer to hide Legend-State from core selector APIs.
- Heavy direct testing of React components.
- Immediate full migration of every existing consumer to domain-shaped hooks.
- Any GitHub issue creation or issue workflow automation for this PRD.

## Further Notes

- The architectural goal is not to eliminate fresh object creation at the source layer. It is to make source-level ref churn irrelevant after the projector/store boundary.
- The architecture deliberately keeps the source contract simple and pushes stability concerns into one place: the projector/reconciler.
- The synchronous initial seed is an important UX requirement because effect-only external-store bootstrapping can introduce an unacceptable first-paint delay for cached stale data.
- The chosen approach is intentionally conservative in v1: keep existing source hooks, keep the merge contract as full `UIMessage[]`, and move complexity into pure TypeScript deep modules with strong tests.
- If profiling later shows selector filtering cost is still material, specialized selector helpers can be introduced using the agreed invariants.
- If profiling later shows full canonical synchronous seeding is too complex for v1, cache-only synchronous seed remains an acceptable fallback path.
- If future work moves more reactivity outside React, the projector/store architecture should still remain valuable as the canonical message entity boundary.
