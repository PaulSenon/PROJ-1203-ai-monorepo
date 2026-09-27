# PRD - Referentially Stable Chat Messages With Hot-Path Merge Isolation

## Problem Statement

The chat conversation surface currently renders the correct message transcript, but it does too much work while doing so.

The transcript shown to the user is not backed by one simple source. It is assembled from multiple layers that overlap in time and ownership:

1. an initial local cached transcript snapshot,
2. persisted paginated database messages,
3. a resumed streaming assistant message rebuilt from persisted stream deltas,
4. a first-class HTTP streaming assistant message driven by the AI SDK,
5. optimistic local patches that may later be reverted.

This merge logic runs on a very hot path. During streaming, it may execute multiple times per second. The UI already behaves correctly in the happy path, but there is too much reference churn even when the visual output has not changed.

That creates several concrete problems:

1. visually identical messages swap object references when ownership moves from one source layer to another,
2. completed rows rerender even though only the actively changing tail should rerender,
3. expensive downstream work such as markdown rendering is re-triggered more often than necessary,
4. the current hook mixes React concerns, source normalization, merge policy, and stabilization logic in one sensitive place,
5. the implementation has grown feature creep and is harder to reason about than its core responsibility warrants,
6. because the merge path is hot, even small unnecessary operations compound into visible smoothness regressions.

The desired outcome is not merely “fewer renders” in the abstract. The desired outcome is:

1. `messages[]` stays referentially stable when visual output is unchanged,
2. unchanged message objects and unchanged sub-properties stay referentially stable,
3. only the active changing tail pays meaningful update cost during streaming,
4. the merge system remains simple enough to trust and maintain,
5. performance work does not introduce broad architectural risk or feature creep.

This work must challenge the existing implementation rather than preserve it out of habit.

## Solution

Rebuild the message assembly strategy around a small set of explicit, testable modules, while keeping the React integration thin and conservative.

The solution is intentionally phased.

### Phase 1: Upstream hot-path stabilization

Extract the core non-React message assembly logic into pure TypeScript modules with explicit inputs and outputs. These modules will own:

1. source normalization,
2. ordering policy,
3. merge policy across overlapping message sources,
4. narrow referential stabilization for unchanged messages, parts, and metadata,
5. resumed-stream reconstruction reuse.

React hooks remain adapters around these pure modules. They should gather data from the cache, database, resumed stream, HTTP stream, and optimistic patches, then pass stable inputs into the core assembly engine.

The key design rule for this phase is to optimize the hot path first before introducing new state architecture. We should not begin with a store rewrite.

### Phase 2: Downstream render hardening

Once upstream message identity is stable, reduce downstream render cost so only the active dynamic tail does meaningful work.

This phase focuses on:

1. explicit static vs streaming markdown paths,
2. one-way consolidation rules for settled rows,
3. keeping layout-only tail behavior outside message memo boundaries,
4. ensuring completed messages do not keep paying streaming-oriented rendering costs.

The purpose of this phase is not to hide upstream problems. It depends on Phase 1 creating stable message identities first.

### Phase 3: Optional granular subscription architecture

Only if Phases 1 and 2 prove insufficient, introduce a local per-thread message entity store with granular subscriptions.

This phase is intentionally conditional. It should happen only if the simpler prop-based architecture still leaves too much visible-row churn.

If adopted, the store should subscribe by ordered ids at the list level and by message id at the row level. A store that still replaces a whole `messages[]` snapshot on each tick is not enough and should not be considered a meaningful solution.

### Deep module strategy

The most important structural decision in this PRD is to extract the core assembly logic into deep modules that are independent from React. These modules should encapsulate the complexity behind small, stable interfaces and become the main unit of confidence for this work.

The likely deep modules are:

1. a source normalization module,
2. a message assembly module,
3. a message stabilization module,
4. a resumed-stream reconstruction module or helper,
5. small React adapter hooks that compose the modules above.

This is important both for clarity and for testing. The merge and stabilization rules are sensitive enough that they should be validated primarily with fast deterministic tests rather than only through UI observation.

## User Stories

1. As a chat user, I want streaming replies to feel smooth, so that the app feels fast while the model is generating.
2. As a chat user, I want completed older messages to remain visually calm while a new assistant reply streams, so that only the active tail appears dynamic.
3. As a chat user, I want a message that moves from cache to persisted ownership to remain visually stable, so that the transcript does not feel like it is reloading itself.
4. As a chat user, I want a message that moves from HTTP stream ownership to persisted ownership to stay visually identical, so that the handoff feels seamless.
5. As a chat user, I want resumed streaming after refresh or reconnect to keep only the unfinished portion dynamic, so that prior content does not keep rerendering.
6. As a chat user, I want long conversations to remain responsive during streaming, so that older visible rows do not become a performance tax.
7. As a chat user, I want markdown-heavy completed messages to stay settled while new tokens arrive elsewhere, so that reading older content remains pleasant.
8. As a chat user, I want optimistic local patches to merge correctly without making unrelated rows unstable, so that local interactions stay fast and trustworthy.
9. As a chat user, I want loading more persisted history to prepend or extend correctly without disturbing unchanged rows, so that pagination feels safe and stable.
10. As a chat user, I want refresh or reconnection scenarios to preserve transcript continuity, so that I do not see duplicate or visually jumping assistant messages.
11. As a chat user, I want the message list to stay smooth on desktop and mobile, so that streaming quality is consistent everywhere.
12. As a developer, I want the message assembly rules written down explicitly, so that source precedence is no longer implicit or fragile.
13. As a developer, I want normalization to be source-specific, so that ordering assumptions are auditable and not hidden behind generic helpers.
14. As a developer, I want the hot merge path to avoid generic work such as full-list resorting when a narrower operation is sufficient, so that streaming cost stays low.
15. As a developer, I want unchanged message objects to preserve identity across merges, so that React memoization and virtualization can actually pay off.
16. As a developer, I want unchanged message parts to preserve identity across merges, so that subtrees like markdown and reasoning stop rerendering needlessly.
17. As a developer, I want unchanged metadata objects to preserve identity where safe, so that metadata consumers do not rerender for invisible changes.
18. As a developer, I want debug-only origin tagging to stop forcing clones on the production hot path, so that observability does not tax normal users.
19. As a developer, I want the resumed-stream reconstruction logic to reuse prior built state when possible, so that rebuilding one streamed message does not start from zero every tick.
20. As a developer, I want the React hook layer to become a thin adapter, so that business rules live in pure TypeScript instead of in hook effects and memo chains.
21. As a developer, I want the pure merge engine to be testable in isolation, so that future refactors can be made safely.
22. As a developer, I want the core merge engine to encode only necessary behavior, so that performance work does not become another feature-creep surface.
23. As a maintainer, I want the simplest effective architecture to land first, so that we do not reach for a store rewrite prematurely.
24. As a maintainer, I want an optional later path toward granular subscriptions to remain available, so that we can escalate only if the simpler plan is insufficient.
25. As a maintainer, I want the system to define clear invariants around ordering, source precedence, and stabilization, so that correctness can be reasoned about independently of React.
26. As a maintainer, I want downstream render work to become an explicit second phase, so that upstream and downstream performance problems do not get conflated.
27. As a maintainer, I want the transcript assembly engine to remain self-contained and easy to profile, so that performance regressions are easier to detect.
28. As a maintainer, I want the final design to work with the virtualized list rather than against it, so that virtualization keeps delivering value.
29. As a maintainer, I want the implementation to preserve current user-visible correctness while reducing invisible work, so that risk stays controlled.
30. As a maintainer, I want tests to protect behavioral contracts rather than implementation trivia, so that internal refactors remain possible.
31. As a maintainer, I want the PRD to stay disciplined about scope, so that this performance track does not silently turn into a broad chat architecture rewrite.
32. As a maintainer, I want the result to be elegant enough that future contributors can extend it without reintroducing hidden churn, so that the codebase improves instead of merely shifting complexity.

## 'Polishing' Requirements

1. The transcript must remain visually identical to current behavior except where deliberate performance hardening changes streaming-vs-static rendering policy.
2. Settled rows must feel calm and stable while the active tail streams.
3. HTTP-stream to persisted handoff must feel seamless and not visually “swap” the same message.
4. Resumed-stream rendering after reconnect or refresh must feel continuous and not reconstruct the whole visible transcript.
5. Markdown-heavy completed messages must remain performant without looking degraded.
6. Reasoning-heavy messages must remain functionally correct while becoming cheaper in their collapsed or settled states.
7. Debug instrumentation, counters, and profiling helpers added during implementation must be removable and must not leak into production behavior.
8. Naming of the extracted core modules must be simple, mechanical, and obviously tied to their responsibility.
9. The final design must remain understandable to a future maintainer reading the modules without prior conversation context.
10. The work must improve smoothness without introducing fragile cleverness that would be difficult to audit later.

## Implementation Decisions

1. **Three-phase plan**
   - Phase 1 is mandatory and solves the upstream hot path.
   - Phase 2 is expected and solves downstream render waste after upstream identity is stable.
   - Phase 3 is conditional and should happen only if simpler approaches still do not meet the performance target.

2. **Deep module extraction first**
   - The core message assembly logic should move into pure TypeScript modules before major behavior changes are attempted.
   - React hooks should become wiring layers that gather source data and invoke the pure modules.
   - This extraction is not optional polish. It is a core strategy for both confidence and performance reasoning.

3. **Source-specific normalization**
   - Each source type should have an explicit normalizer.
   - The system should not rely on one generic normalization helper that hides important ordering assumptions.
   - Persisted paginated data may remain in its current backend-facing order, but normalization at the assembly boundary must produce one canonical order for merging.

4. **Canonical assembly order**
   - The assembly engine should operate on one canonical display order only.
   - Any source that arrives in a different order must be normalized before merge.
   - The final assembly engine should avoid repeated full sorting on the hot path when a narrower deterministic merge is sufficient.

5. **Explicit source precedence**
   - The assembly engine must document and encode the precedence between cached, persisted, optimistic, resumed-stream, and HTTP-stream sources.
   - Source precedence must be treated as product behavior, not as an incidental consequence of array concatenation order.

6. **Narrow stabilization, not generic deep magic**
   - Referential stabilization should be explicit and schema-aware.
   - Reuse should focus on message objects, metadata objects, and message parts where visible output is unchanged.
   - Avoid broad recursive “reuse any nested object that looks equal” logic. That approach is too risky and too hard to audit.

7. **Debug-origin tagging must not tax production**
   - Debug-only source tagging is valuable, but it must not force cloning on the production hot path.
   - Production behavior should avoid origin metadata updates that change object identity for no user-visible reason.

8. **Resumed-stream reconstruction must reuse prior state**
   - Rebuilding the resumed streaming message should support seeding from the previously built message for the same stream lifecycle.
   - When the stream identity changes, the seed resets.
   - The goal is to keep earlier settled parts stable while only the changing tail mutates.

9. **React integration stays conservative**
   - Existing hook and provider boundaries should be preserved unless a change is required by the extracted core engine or by a proven render bottleneck.
   - We should not rewrite chat state ownership as part of the initial upstream stabilization work.

10. **Base-vs-live assembly split remains valid**
    - Separating low-frequency sources from high-frequency sources is still the correct broad idea.
    - The extracted core engine should preserve that performance-aware shape while making the rules simpler and more testable.

11. **Downstream rendering becomes an explicit phase**
    - Once upstream message identity is stabilized, completed rows should use explicitly static rendering paths wherever possible.
    - Streaming-oriented rendering behavior should remain only for the active changing tail.
    - A one-way consolidation rule may be used so a row that has become settled does not flip back into a more expensive streaming mode within the mounted scope.

12. **Optional store path is hybrid and granular only**
    - If a store is later required, it should expose ordered ids and per-message subscriptions.
    - The list should subscribe to ordered ids only.
    - Each row should subscribe to its own message data only.
    - Replacing the whole assembled message array inside an external store is explicitly not considered a sufficient optimization.

13. **Hot-path cache writes should be deduplicated**
    - Writing back a cached transcript snapshot on every hot-path merge tick is too blunt.
    - Cache updates should occur only when the meaningful cached tail has actually changed according to explicit criteria.

14. **Instrumentation is part of implementation, not an afterthought**
    - The implementation should include temporary measurement hooks for render counts, reference reuse rates, and hot-path timing.
    - These measurements are necessary to prove which phase delivers which gain.

15. **Complexity budget stays strict**
    - The implementation must prefer the smallest correct solution at each phase.
    - If a simpler design can achieve the goal, the more complex design should be rejected even if it appears more “future-proof.”

## Testing Decisions

1. **Test quality bar**
   - Good tests validate externally meaningful contracts and stability guarantees.
   - Tests should not assert internal memoization tricks or incidental helper structure.
   - The most valuable tests for this work prove ordering, precedence, handoff continuity, and reference reuse when visual output is unchanged.

2. **Primary testing strategy**
   - The extracted pure TypeScript modules should be the primary unit-test target.
   - Fast deterministic Vitest tests should cover the bulk of merge and stabilization behavior.
   - React-level tests should remain lighter and focus on integration contracts rather than exhaustive merge permutations.

3. **TDD preference for the extracted core**
   - The pure core assembly and stabilization modules should ideally be implemented test-first or at least test-led.
   - This is especially valuable for the most sensitive invariants, such as source precedence, referential reuse, and stream handoff behavior.
   - The purpose is not ritual TDD for every line. The purpose is to lock the contract before reshaping a risky hot path.

4. **Core module scenarios to test**
   - normalization of each source type into canonical order,
   - merge precedence across overlapping cached, persisted, optimistic, resumed, and HTTP message layers,
   - referential reuse when a message is visually unchanged,
   - referential reuse when message parts are unchanged but other messages in the list changed,
   - metadata reuse when non-visual metadata does not require a new visible result,
   - proper replacement when visible output does change,
   - seamless ownership handoff for the same message id across source layers,
   - pagination growth without unnecessary churn to already assembled newer messages,
   - optimistic patch apply and revert behavior,
   - resumed-stream reconstruction progression across chunk additions,
   - stream reset behavior when stream identity changes.

5. **Downstream behavior scenarios to test**
   - settled rows using static rendering paths,
   - streaming tail retaining streaming behavior,
   - rows not flipping back from settled to dynamic mode within one mounted conversation scope when that rule is adopted,
   - markdown-heavy completed content preserving output while skipping unnecessary streaming-only work.

6. **Measurement-oriented validation**
   - During implementation, temporary checks should confirm how many message references are reused between successive assemblies.
   - Temporary checks should also count changed ids versus changed references, so regressions are visible during development.
   - Profiling should confirm whether hot-path assembly time and visible-row rerender counts actually improve.

7. **React integration tests**
   - Integration tests should confirm that the adapter hooks still expose the correct transcript and status behavior once the pure engine is in place.
   - These tests should avoid mirroring every pure-module case and instead focus on correct integration with the surrounding chat state.

8. **Automated checks**
   - Run `pnpm run test` for the relevant target once the new Vitest coverage exists.
   - Run `pnpm run check-types` after implementation.

9. **Prior art policy**
   - Reuse the repo’s current Vitest and chat-behavior testing style where possible.
   - Do not introduce a novel testing style if the existing setup is sufficient for deterministic pure-module tests.

## Out of Scope

1. A broad rewrite of overall chat architecture.
2. A broad rewrite of provider ownership unrelated to message assembly and render stability.
3. Replacing the virtualization strategy.
4. Redesigning message UI or transcript product behavior beyond what is necessary for performance hardening.
5. A generalized external-store migration as a starting point.
6. Over-abstracting the message engine for hypothetical future use cases that do not exist today.
7. Unrelated transport, backend, or schema redesign unless a narrow change is required to preserve current correctness.
8. New message features, transcript features, or editing features.
9. Premature micro-optimizations outside measured bottlenecks.

## Further Notes

1. The current system already proves that the product behavior is possible. The challenge is to preserve that correctness while removing invisible work.
2. The highest-leverage improvement is expected to come from Phase 1, because downstream memoization cannot pay off if upstream identity keeps churning.
3. Phase 2 should be treated as the point where static-vs-streaming rendering policy becomes explicit rather than accidental.
4. Phase 3 should be treated as an escalation path, not as the default architecture.
5. Success should be judged with both correctness and measurement. The target is not “zero renders.” The target is to ensure only updates with visible impact still pay meaningful cost.
6. The extracted pure TypeScript core should become the durable seam that outlives the current hook arrangement.
7. If a proposed optimization makes the system materially harder to reason about without a proven gain, that optimization should be rejected.
8. This PRD should remain the authoritative plan for the message-stability track even if earlier branch experiments explored parts of the same space differently.

## Unresolved Questions

1. Whether a one-way settled-row consolidation rule should be adopted immediately in Phase 2 or only after upstream metrics are confirmed.
2. The exact threshold that will define “good enough” after Phases 1 and 2 before Phase 3 is allowed to start.
3. Whether any currently exposed metadata fields are intentionally allowed to change reference despite no visible output change, or whether all such cases should be normalized behind explicit rules.
