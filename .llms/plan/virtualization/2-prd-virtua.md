# PRD - Virtua Migration for Chat Virtualization (Perf-First, No UX Drift)

## Problem Statement

The current chat virtualization stack works but still feels imperfect in real UX:

- conversation behavior is now acceptable but still fragile around dynamic-height transitions,
- interaction smoothness is not consistently "native-feel" under heavy chat payloads,
- implementation complexity grew around framework-specific behavior,
- we need a cleaner, more reliable virtualization foundation while preserving current successful UX contracts.

From user perspective, virtualization must be invisible:

1. opening a thread must feel instant and stable,
2. initial open must land at bottom with no visible jump,
3. streaming must not move viewport unless user is already at bottom,
4. modal-like interactions must remain instant even with heavy conversation content.

## Solution

Migrate from TanStack Virtual to Virtua with a strict behavior-preserving approach:

1. Keep current proven interaction contracts (boot-gated reveal, bottom-anchor semantics, submit anchor behavior, streaming no-autofollow, sidebar load-more contract).
2. Replace only virtualization engine internals (conversation + sidebar) with Virtua equivalents.
3. Use Virtua **normal mode** (not reverse/chat mode) for conversation to avoid iOS reverse-scroll caveats and keep existing window-scroll semantics.
4. Keep rollout patch-in-place on current branch, not full rollback to pre-virtualization baseline.

This gives a cleaner virtualization engine change without reintroducing solved UX regressions.

## User Stories

1. As a chat user, I want thread opening to feel instant, so interaction feels native.
2. As a chat user, I want first visible frame at thread open to already be at bottom, so there is no flicker or jump.
3. As a chat user, I want submit to land exactly at bottom, so I can immediately follow assistant output.
4. As a chat user, I want streaming growth to not move my viewport when I am reading older content.
5. As a chat user, I want sidebar scrolling to remain smooth on mobile and desktop.
6. As a chat user, I want sidebar load-more to keep triggering reliably during fast scroll.
7. As a chat user, I want no empty-gap artifacts in virtualized lists.
8. As a chat user, I want context-menu/drawer/dialog opening to remain responsive with heavy conversation rendered.
9. As a chat user, I want sidebar overlay/backdrop behavior unchanged.
10. As a chat user, I want sticky input and keyboard behavior unchanged.
11. As a developer, I want virtualization internals simpler than current implementation, so maintenance cost is lower.
12. As a developer, I want no fallback runtime mode and no feature-flag complexity, so behavior is deterministic.
13. As a developer, I want stable key-based virtualization invariants preserved, so measurement/anchor behavior remains correct.
14. As a developer, I want current boot visibility gate retained, so first-paint UX stays clean.
15. As a developer, I want current load-more gating contract retained, so pagination behavior stays reliable.
16. As a maintainer, I want a phased migration plan with objective acceptance gates, so regressions are caught quickly.
17. As a maintainer, I want migration decisions documented without ambiguous fallback branches.
18. As a maintainer, I want the final UI behavior indistinguishable from non-virtualized UX.

## 'Polishing' Requirements

1. No visible layout drift in conversation or sidebar.
2. No visible jump at thread open, submit, or stream completion.
3. Last-assistant reserve behavior remains unchanged.
4. Scroll-to-bottom button behavior remains unchanged.
5. Sidebar header/footer overlay effect remains unchanged.
6. Context menu/drawer/dialog open latency feels instant under heavy conversation.
7. Mobile touch scrolling remains smooth and reliable.
8. No debug logs or instrumentation noise leaks into runtime UX path.

## Implementation Decisions

1. **Migration strategy decision**
   - Rework on current branch HEAD, not full rollback to pre-virtualization commit.
   - Rationale: current branch already contains correct UX contracts that must be preserved; rollback would reintroduce solved regressions and expand scope.

2. **Virtualization engine decision**
   - Replace TanStack Virtual with Virtua for both surfaces:
     - conversation: window-scroller virtualization,
     - sidebar: element-scroller virtualization.

3. **Conversation mode decision**
   - Use Virtua normal mode.
   - Do not use reverse/chat mode for production conversation in this phase.
   - Keep current bottom-anchor model through explicit anchor control + visibility gating.

4. **Behavior contracts to keep unchanged (must preserve)**
   - boot-gated reveal (`opacity: 0`) until anchor-ready,
   - pending-submit auto-scroll intent semantics,
   - streaming no-force-follow semantics,
   - last-assistant reserve-space UX contract,
   - bottom/checkpoint probe architecture for future last-read checkpoint evolution,
   - sidebar load-more gating by pagination status + near-end threshold.

5. **TanStack-specific logic to remove/replace**
   - hook-based virtualizer plumbing,
   - tanstack-specific measurement/adjustment option wiring,
   - tanstack dependency and lockfile entries.

6. **Virtua adapter architecture**
   - Build two deep adapters with strict, minimal interfaces:
     - Sidebar Virtua Adapter: thread range rendering + near-end load trigger.
     - Conversation Virtua Adapter: window virtualization + bottom-anchor lifecycle + submit anchor contract.
   - Keep presentational components unchanged.

7. **Initial anchor policy**
   - Keep boot gate and resolve reveal only when bottom-anchor condition is satisfied.
   - No timer-driven reveal fallback and no retry-loop hacks.
   - Open budget target remains <=100ms for reveal in canonical heavy fixture.

8. **Scroll behavior policy**
   - Programmatic anchor actions remain non-smooth for deterministic placement.
   - No forced continuous auto-follow while streaming.

9. **Overlay performance compatibility**
   - Migration must not regress context-menu/drawer/dialog interaction INP.
   - Virtualization integration must preserve render isolation expectations from existing CSS/layout segmentation.

10. **Scope boundaries**
    - No additional product features.
    - No new runtime fallback mode for virtualized/non-virtualized paths.
    - No broad overlay-library migration in this PRD (Virtua migration only).

## Testing Decisions

1. **Good test definition**
   - Validate external behavior and perceived UX contracts, not internals of the virtualization engine.

2. **Execution mode for this phase**
   - Manual QA + production-profile trace validation.
   - `pnpm run check-types` on each migration step.

3. **Modules to validate**
   - Conversation Virtua Adapter (anchor stability, submit behavior, stream stability).
   - Sidebar Virtua Adapter (smooth range rendering, load-more reliability).
   - Boot gate lifecycle (hidden -> anchored reveal under 100ms target).
   - Overlay interaction path (context menu and drawer responsiveness under heavy conversation).

4. **Mandatory QA matrix**
   - heavy fixture open-to-bottom first frame,
   - submit exact-bottom,
   - streaming while reading mid-history (no jump on completion),
   - fast sidebar scroll + repeated load-more,
   - context-menu open cost on heavy conversation,
   - mobile drawer + sidebar behavior.

5. **Acceptance gates**
   - Thread-open reveal <=100ms in canonical heavy fixture.
   - Context-menu/drawer interaction remains instant-feel (no notable regression vs current good state).
   - No visible jump in required anchor paths.

## Out of Scope

1. Persisted message height cache implementation.
2. Reverse/chat-mode migration in Virtua.
3. New data-layer pagination features for conversation beyond current scope.
4. Overlay library replacement/migration unrelated to Virtua adoption.
5. Visual redesign of chat/sidebar components.

## Further Notes

1. Virtua supports window virtualization and dynamic item measurement, and includes reverse-scroll features, but this PRD intentionally avoids reverse mode for conversation due known iOS caveats.
2. This PRD keeps only baseline, deterministic features and explicitly avoids workaround loops/timers/sync-force patterns in anchor logic.
3. Migration success is defined by invisible virtualization from user perspective, not by framework feature parity.
4. If migration cannot satisfy the hard UX contracts, fallback is to halt and reassess architecture before adding complexity.

## Unresolved Questions

- none
