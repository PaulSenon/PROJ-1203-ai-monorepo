# PRD - Phase 1 Instant Navigation Feedback (Blank Transition)

## Problem Statement

Thread navigation feedback is not instant.

Today, selecting a thread in sidebar triggers expensive chat subtree rerenders/remounts immediately in the same critical path as navigation intent. Result: URL + selected item update are coupled with heavy render cost, hurting INP and perceived responsiveness.

From user perspective, expected behavior is:

- click thread
- URL updates immediately
- sidebar selected state updates immediately
- conversation area instantly switches to blank transition state
- heavy conversation render resolves after, then appears

Current architecture blocks that UX due to global provider scope, forced rerender triggers, and keyed remount patterns tied directly to navigation id.

## Solution

Refactor chat navigation/rendering boundaries so navigation intent and heavy conversation rendering are decoupled.

Phase 1 delivers only instant navigation feedback pattern:

1. Keep navigation state immediate (route and selected thread update now).
2. Defer heavy thread-scoped render consumption (deferred thread id).
3. While deferred render is catching up, show blank conversation transition state (not stale content, not data loading placeholder).
4. Render thread-scoped heavy tree only on deferred id.

Important scope rule:

- No Activity pool in Phase 1.
- No return-visit DOM/state caching in Phase 1.
- No render-cost optimization of conversation internals in Phase 1.

## User Stories

1. As a chat user, I want thread click feedback to feel instant, so app feels responsive.
2. As a chat user, I want sidebar selected thread to update immediately on click, so my intent is acknowledged instantly.
3. As a chat user, I want URL to change immediately when I select a thread, so navigation state is always in sync.
4. As a chat user, I want conversation panel to clear immediately during thread switch, so I never see old thread pretending to be current.
5. As a chat user, I want the new conversation to appear once ready, so transition is predictable.
6. As a chat user, I want rapid multi-click thread switching to still feel instant, so I can scan threads quickly.
7. As a chat user, I want latest click to win during rapid switching, so wrong thread does not flash.
8. As a chat user, I want no stale thread content shown during transition, so mental model stays correct.
9. As a chat user, I want keyboard and pointer navigation behavior unchanged, so interaction remains familiar.
10. As a chat user, I want mobile and desktop behavior parity for instant feedback, so UX stays consistent.
11. As a chat user, I want new chat navigation to follow same instant pattern, so behavior is consistent across entry points.
12. As a chat user, I want deletion/navigation edge cases not to break transition behavior, so UI feels reliable.
13. As a developer, I want navigation coordinator to own only routing intent, so architecture is simple.
14. As a developer, I want thread-scoped providers to receive thread identity via explicit props, so state boundaries are deterministic.
15. As a developer, I want to remove forced remount trigger hacks, so concurrency features can work as intended.
16. As a developer, I want clear render boundary between immediate shell and deferred heavy tree, so future tuning is safe.
17. As a maintainer, I want Phase 1 to be independent from Activity pool, so risk is reduced.
18. As a maintainer, I want model-selection behavior preserved (UI global, value per thread), so no product regression.
19. As a maintainer, I want app-load readiness signals to remain coherent after refactor, so startup UX does not regress.
20. As a maintainer, I want explicit non-goals documented, so scope stays tight and avoids feature creep.

## 'Polishing' Requirements

1. Thread click feels immediate even on heavy conversations.
2. No stale conversation flash during switch.
3. Blank transition state is visually clean and stable (no jump/flicker).
4. Sidebar interactions (hover, context menu, keyboard) unchanged.
5. New chat and existing chat flows both respect instant-feedback pattern.
6. Dev-only logs/debug instrumentation removed.
7. Transition behavior consistent on desktop + mobile.

## Implementation Decisions

1. **Navigation Coordinator (Immediate Layer)**
   - Keep a slim navigation state module responsible only for route-driven selection intent.
   - Ensure stable new-chat id semantics (no per-render random id churn).
   - Expose `selectedId`, `isNew`, and open/persist navigation actions.

2. **Deferred Render Gate (Heavy Layer Boundary)**
   - Introduce a dedicated boundary module that computes deferred thread id from immediate selected id.
   - Derive `isSwitching = selectedId !== deferredSelectedId`.
   - During `isSwitching`, render blank conversation transition state.

3. **Thread Surface Composition**
   - Heavy thread surface (conversation + thread-scoped providers + thread-scoped input state) renders from deferred id only.
   - Immediate navigation shell (sidebar selection + URL) stays outside heavy boundary.
   - Maintain latest-intent-wins behavior during rapid switches.

4. **Provider Scope Refactor**
   - Convert thread-sensitive providers to explicit thread-scoped contracts (thread id / isNew) instead of implicit nav reads.
   - Remove forced rerender wrapper pattern around providers.
   - Keep provider responsibilities unchanged in Phase 1 (scope migration only).

5. **Removal of Forced Remount Mechanisms**
   - Remove key-driven rerender trigger abstraction used to reset subtree on nav changes.
   - Remove redundant key-based remounting on conversation root where it conflicts with deferred boundary behavior.

6. **Route/Layout Responsibility Split**
   - Keep route for URL state and route ownership.
   - Move primary heavy thread rendering responsibility to a persistent chat surface boundary compatible with deferred rendering.
   - Keep secondary routed content behavior unchanged if present.

7. **Blank Transition UX Policy**
   - Blank state is a transition shell, not data loading skeleton.
   - Do not show stale thread content during transition.
   - Do not introduce Activity or hidden pre-render in this phase.

8. **Model Selection Contract**
   - Preserve global selector UI placement.
   - Preserve per-thread selected model value semantics.
   - Ensure model value resolves against deferred active thread to avoid cross-thread bleed.

9. **App Readiness Signals**
   - Preserve startup readiness semantics while adapting active-thread readiness to new boundary.
   - Ensure transition periods do not incorrectly mark app as blocked after initial readiness.

10. **Architecture Readiness for Phase 2**
    - Phase 1 intentionally lays boundaries needed for later Activity pool.
    - Do not implement pooling/caching infra now.

## Testing Decisions

1. **Test quality bar**
   - Verify external behavior (navigation feedback + visual state changes), not internal implementation details.
   - Success criteria prioritize perceived responsiveness and correctness of state transitions.

2. **Automated checks in scope**
   - Run `pnpm run check-types`.

3. **Manual QA scenarios (required)**
   - click thread A -> B: URL + selected item change immediately; conversation clears immediately; B appears later.
   - click A -> B -> C quickly: selected + URL track latest click instantly; only latest thread renders.
   - new chat navigation: instant transition behavior consistent.
   - switch across heavy and light threads: no stale flash, no lockup.
   - keyboard navigation in sidebar: same semantics + instant feedback.
   - mobile drawer flow: thread switch feedback remains instant.

4. **Regression checks**
   - send/regenerate flow still works after provider scope migration.
   - draft and input lifecycle remain coherent per thread.
   - model selection semantics remain per-thread.

5. **Definition of done (phase 1)**
   - Instant acknowledgment on thread click is achieved.
   - Blank transition behavior is stable and deterministic.
   - No Activity pool behavior present.

## Out of Scope

1. Activity pool implementation.
2. Return-visit instant DOM/state restore.
3. Conversation render-performance optimization internals (markdown, virtualization, list refactors).
4. Data prefetch/prewarm strategy.
5. New visual redesign of chat surfaces.
6. Sidebar architecture rewrite unrelated to nav feedback.
7. Additional product features outside thread-switch UX.

## Further Notes

1. This PRD is Phase 1 only by explicit product decision.
2. It creates the concurrency-safe architecture foundation required for later pooling, without shipping pooling now.
3. Any attempt to add Activity in this phase is considered scope creep and must be rejected.
4. If transition UX conflicts with legacy reset hacks, remove hacks in favor of explicit boundary contracts.

## Unresolved Questions

1. Blank transition surface should hide input too, or keep input frame visible but inert?
2. During switch, should submit controls be disabled hard, or remain interactive and queue intent?
3. Should transition shell include subtle motion/fade, or remain fully static for minimal latency signal?
