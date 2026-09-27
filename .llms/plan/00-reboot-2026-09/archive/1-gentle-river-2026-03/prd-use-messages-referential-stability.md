# PRD - `useMessages` Referential Stability Hardening

## Problem Statement

The chat message aggregation layer is a core hot path. It merges persisted history, cache snapshot, optimistic patches, resumed stream output, and HTTP stream output into one render-ready conversation array.

Today, this layer frequently creates new message objects and new nested `parts` / `metadata` objects even when the rendered output is effectively unchanged. That breaks shallow memoization, increases message-row rerenders, increases markdown part rerenders, and weakens virtualization efficiency during the most frequent updates.

This is especially risky because:

- streaming updates are frequent and continuous;
- completed messages should become stable quickly and stay stable;
- only the currently mutating tail should remain reactive;
- cache/persisted/stream transitions should not cause broad avoidable rerenders;
- this hook is a critical app bottleneck and must stay readable, explicit, and safe to evolve.

The current normalization API also hides source-specific ordering rules behind a generic helper, which makes correctness more implicit than it should be for a critical merge pipeline.

## Solution

Harden the message aggregation pipeline so it preserves referential stability whenever the rendered message output has not changed.

The solution has five parts:

1. Replace generic message normalization with source-specific normalization entrypoints and branded normalized types so each source must be explicitly normalized before merge.
2. Make debug-only datasource injection optional behind a local constant flag so production hot-path merges avoid cloning solely for debug metadata.
3. Rebuild resumed stream messages by seeding reconstruction from the previously built message so stream resume work can reuse prior message structure when supported.
4. Add a post-merge stabilization pass that reuses previous message, parts, and metadata references when values are unchanged, with strict early-return fast paths and minimal work on the common case.
5. Keep scope limited to the message aggregation layer and its immediate wrapper responsibilities, including any reference churn introduced by the app wrapper around the SDK chat context, while explicitly not attempting to redesign or outperform the underlying SDK message model.

## User Stories

1. As a chat user, I want completed older messages to stay visually stable while a new answer streams, so reading history does not feel jittery.
2. As a chat user, I want only the currently changing assistant tail to rerender during streaming, so the interface feels calm and fast.
3. As a chat user, I want message content that has already completed to stop rerendering, so markdown rendering remains smooth.
4. As a chat user, I want only the currently streaming message part to update, so previously completed parts do not reflow unnecessarily.
5. As a chat user, I want cached history to transition into persisted history without visible churn, so page refresh or restore feels seamless.
6. As a chat user, I want resumed stream output to replace stale cache or persisted shells without broad UI disturbance, so resume feels invisible.
7. As a chat user, I want optimistic messages to converge into persisted or streamed messages with minimal visual movement, so sending feels polished.
8. As a chat user, I want scrolling performance in long conversations to remain smooth while tokens stream, so the app feels native.
9. As a chat user, I want virtualization to avoid rerendering unchanged rows, so large threads stay responsive.
10. As a chat user, I want loading older pages of persisted messages to avoid destabilizing the current viewport, so reading context is preserved.
11. As a developer, I want each message source to declare its normalization contract explicitly, so ordering bugs are harder to introduce.
12. As a developer, I want source-specific reversal rules to be encoded in type-safe entrypoints, so future contributors cannot forget required normalization.
13. As a developer, I want message stabilization policy centralized in a small set of helpers, so the merge path stays readable and auditable.
14. As a developer, I want newly added metadata fields to trigger rerenders by default, so optimization does not silently hide new reactive state.
15. As a developer, I want ignored metadata fields to be controlled by a blacklist, so optimization remains explicit and conservative.
16. As a developer, I want debug-only datasource tagging to be removable from the hot path, so profiling and production behavior can diverge safely.
17. As a maintainer, I want the hook to preserve correctness first and optimize second, so future changes do not trade stability for hidden bugs.
18. As a maintainer, I want the hook to avoid deep full-list comparisons on every tick, so the happy path remains cheap.
19. As a maintainer, I want the wrapper around SDK chat messages to avoid adding extra identity churn, so app code does not erase SDK-level optimizations.
20. As a maintainer, I want this work scoped to the aggregation layer instead of a broad chat rewrite, so risk stays controlled.

## 'Polishing' Requirements

1. Completed messages and completed parts should remain referentially stable across unrelated streaming updates.
2. Only the active mutating tail should receive new references in the normal streaming happy path.
3. The implementation must favor early returns and obvious control flow over clever but opaque optimization tricks.
4. Temporary debug behavior must remain behind an explicit local flag.
5. The final code should read like a deterministic data pipeline, not like a bundle of ad hoc patch logic.
6. Any deferred optimization left out of scope must be documented with concise TODO comments where relevant.
7. Type contracts should make ordering and normalization intent obvious at call sites.
8. No new feature creep should be introduced under the pretense of optimization.

## Implementation Decisions

1. **Source-specific normalization contracts**
   - Replace the current generic normalization helper with source-specific normalization entrypoints.
   - Each source returns a branded normalized message list tagged by source identity.
   - Persisted messages use a dedicated desc-to-asc normalization entrypoint; all other sources use dedicated asc-preserving entrypoints.
   - Merge inputs only accept branded normalized lists, not raw message arrays.

2. **Debug datasource gating**
   - Datasource tagging used only for debugging is controlled by a local constant flag.
   - When the flag is off, the merge pipeline must not clone messages solely to add debug datasource metadata.
   - When the flag is on, behavior remains explicit and isolated.

3. **Merge pipeline shape**
   - Keep the existing layered merge model: base layers first, high-frequency layers last.
   - Preserve the current semantic priority rules between cache, persisted, optimistic, resumed stream, and HTTP stream layers.
   - Keep merge logic deterministic and oldest-to-newest oriented.

4. **Post-merge stabilization pass**
   - Add one dedicated stabilization step after semantic merge selection.
   - The stabilizer compares the newly merged output against the previous merged output by message id.
   - The stabilizer must use strict fast paths before doing any nested work.
   - The stabilizer should return the previous full list reference when nothing materially changed.

5. **Message-level fast paths**
   - If the previous and next message references are identical, reuse immediately.
   - If message ids differ, treat as a replacement without extra stabilization work.
   - Message role is treated as invariant and ignored for optimization branching.
   - Nested stabilization work only runs for same-id messages whose top-level references changed.

6. **Parts stabilization policy**
   - Message parts should remain referentially stable as soon as they are completed.
   - In the normal streaming happy path, only the active mutating tail part should receive a new reference.
   - Reuse unchanged prefix part references when the next message structure proves those parts are unchanged.
   - If a safe minimal-tail reuse cannot be proven for a given source update, fall back to replacing that message cleanly rather than introducing risky partial reuse.

7. **Clarification on streaming scope**
   - This PRD does not require inventing a new low-level delta-part merger.
   - It does require the aggregation layer to preserve references when upstream data already allows that proof.
   - For resumed stream reconstruction, reuse is enabled by seeding reconstruction with the previously built message.
   - For HTTP stream messages, the app wrapper must avoid adding avoidable identity churn on top of the SDK output.
   - The underlying SDK message generation behavior itself is trusted and is not rewritten in this scope.

8. **Metadata stabilization policy**
   - Metadata references must remain stable when values are unchanged.
   - Optimization uses an ignore blacklist, not a whitelist.
   - Initial ignore list contains only `updatedAt`, plus `debug.dataSource` when debug datasource tagging is disabled.
   - Any newly added metadata field triggers rerender by default unless explicitly added to the ignore blacklist later.
   - Nested metadata subtrees should retain previous references when unchanged.

9. **Resumed stream reconstruction**
   - The resumed stream builder keeps the previously reconstructed message in a ref.
   - New chunk reconstruction is seeded from the previous built message when rebuilding the current resumed assistant message.
   - This keeps the code readable while enabling upstream stream-reading logic to reuse prior message structure where supported.

10. **App wrapper around SDK chat context**
    - If the app-level wrapper around SDK chat messages introduces extra array or object churn beyond what the SDK already returns, that wrapper-level churn is in scope and should be removed.
    - The goal is to preserve SDK optimizations, not to second-guess or replace SDK internals.

11. **Cache persistence note**
    - Cache persistence behavior remains functionally unchanged in this scope.
    - Add a concise TODO near cache writes explaining that future work should dedupe or throttle persistence based on meaningful render-payload changes.

12. **Readability guardrails**
    - Extract stabilization logic into focused helpers rather than embedding all logic directly inside the merge function.
    - Helpers should separate message stabilization, parts stabilization, and metadata stabilization.
    - Prefer explicit branching and comments for non-obvious invariants only.

13. **Failure mode policy**
    - When a cheap proof of equivalence exists, reuse previous references.
    - When equivalence is uncertain, prefer correctness and replace the affected node instead of risking stale UI.
    - The optimization must never rely on hidden mutable state or implicit side effects.

## Testing Decisions

1. **Test quality bar**
   - Test observable behavior and reference stability contracts, not implementation structure.
   - Avoid brittle tests that depend on helper names or exact internal decomposition.
   - Focus on transitions between source layers and on message/part identity outcomes.

2. **Core scenarios to test**
   - Cache-only to persisted convergence with unchanged rendered messages.
   - Persisted plus optimistic overlay transitions.
   - Persisted or cache shell to resumed stream takeover.
   - HTTP stream updates where only the active tail should change.
   - Deletion or archival filtering behavior under stabilization.
   - Source-specific normalization correctness, especially persisted desc-to-asc normalization.

3. **Reference stability assertions**
   - Unchanged messages retain the same object identity across merges.
   - Completed parts retain the same object identity across unrelated updates.
   - Only the active mutating part changes identity in the normal streaming happy path.
   - Metadata retains identity when only ignored fields change.
   - Metadata changes identity when non-ignored fields change.

4. **Wrapper-level scope tests**
   - If the app wrapper around SDK chat messages previously introduced avoidable identity churn, add coverage proving that unchanged SDK messages are now passed through without extra cloning.

5. **Type-level safety checks**
   - Ensure merge inputs require branded normalized message lists.
   - Ensure raw arrays cannot be passed to the merge layer without explicit normalization.

6. **Automated checks in scope**
   - Run `pnpm run check-types` after implementation.

7. **Manual QA focus**
   - Stream a long assistant response while observing whether old rows visibly rerender or jitter.
   - Refresh or resume mid-stream and confirm stale-to-live transition feels stable.
   - Load older persisted pages and confirm list behavior remains smooth.

## Out of Scope

1. Rewriting the underlying SDK message generation internals.
2. Building a brand-new low-level delta part merger beyond what the current aggregation layer can safely prove and reuse.
3. Redesigning the chat data model or message schema.
4. Broad refactors outside the message aggregation layer and its immediate app wrapper responsibilities.
5. Cache persistence dedupe or throttling implementation beyond a small TODO note.
6. Conversation display-shell stabilization outside the aggregation layer.
7. New chat features, UI redesigns, or unrelated performance work.

## Further Notes

1. This PRD is intentionally narrow because the target hook is a critical performance and correctness chokepoint.
2. Correctness beats optimization whenever equivalence is uncertain.
3. Optimization must remain conservative, explicit, and easy to extend without hidden assumptions.
4. The intended end state is not “never create new arrays”; it is “only create new message and nested references when rendered output truly changed or safe reuse cannot be proven.”
5. Source-specific normalization types are considered part of the solution, not a nice-to-have. They encode ordering correctness directly into the pipeline contract.
6. If future metadata fields are added, they should cause rerenders by default until explicitly reviewed for ignore-blacklist eligibility.
7. The work should leave the aggregation pipeline easier to reason about than before, not merely faster.

## Unresolved Questions

- None currently.
