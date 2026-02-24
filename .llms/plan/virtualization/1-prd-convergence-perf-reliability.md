# PRD - Virtualization Convergence (Perf + Reliability, Patch In Place)

## Problem Statement

Current tanstack-virtual rollout improved some paths but regressed core UX quality:

- modal-like overlay interactions can trigger expensive global work when conversation is heavy,
- mobile sidebar can become unstable under long scrolling/pagination,
- scroll behavior accumulated settle-loop workarounds (RAF retries) that conflict with deterministic architecture goals,
- prior CSS segmentation/defer optimizations were partially lost or not integrated with virtualization strategy.

Product requirement is strict: user must not feel virtualization. Interactions must feel instant and stable.

## Solution

Converge in-place (no branch reset) with a phased hardening plan:

1. remove hacks and restore deterministic scroll behavior,
2. preserve and re-integrate deferred render segmentation in sidebar row internals while keeping virtualized geometry,
3. isolate overlay interaction cost from heavy conversation rendering,
4. enforce hard performance and UX gates on production traces.

Keep TanStack Virtual for both surfaces:

- Sidebar: element virtualizer + deferred row internals.
- Conversation: always window virtualized.

Keep Radix by default. If modal-like no-reflow target cannot be met, allow partial Base UI migration for context menu first.

## User Stories

1. As a user, I want opening thread context menu to feel instant, so quick actions stay responsive.
2. As a user, I want opening drawer/dialog to feel instant, so navigation is frictionless.
3. As a user, I want conversation open to render immediately at exact bottom with no flicker.
4. As a user, I want no visible scroll correction after first paint.
5. As a user, I want streaming content not to move viewport unless I scroll.
6. As a user, I want sidebar to keep loading more threads reliably on mobile.
7. As a user, I want no empty-space artifacts while scrolling sidebar on mobile.
8. As a user, I want heavy codeblock conversations to remain smooth when opening overlays.
9. As a user, I want sidebar toggle INP near-zero feeling even with many threads.
10. As a developer, I want deterministic scroll architecture without RAF/flushSync hacks.
11. As a developer, I want virtualization integrated with prior CSS segmentation principles, not replacing them.
12. As a maintainer, I want objective gates and phased rollout checkpoints.

## 'Polishing' Requirements

1. No visible virtualization artifacts in normal usage.
2. No visual jump on open thread, submit, or overlay open.
3. Overlay layering/blur/backdrop quality preserved.
4. Mobile drawer/sidebar gesture and touch feel preserved.
5. Context menu keyboard/pointer behavior remains coherent.
6. Conversation message spacing and last-assistant reserve rule unchanged.

## Implementation Decisions

1. **Convergence style**
   - Patch current branch in place.

2. **Virtualization stance**
   - Conversation remains always virtualized (window virtualizer).
   - Sidebar remains virtualized for range/geometry.

3. **Sidebar rendering model**
   - Keep virtual range from TanStack.
   - Reintroduce deferred row internals (content segmentation) for low INP under large thread counts.

4. **Overlay architecture**
   - Keep Radix first.
   - Target modal-like UX with relayout-free behavior.
   - Pseudo-modal behavior allowed when required for performance.
   - Scroll blocking required while context menu open, but implementation must avoid global layout churn.

5. **Contingency**
   - If Radix cannot satisfy modal-like no-reflow target after phased hardening, migrate context menu to Base UI first.
   - L1 edits allowed only for Base UI migration path or modal-like relayout-free implementation.
   - Otherwise no L1 optimization edits.

6. **Scroll behavior doctrine**
   - Remove all settle loops (no RAF retry loops).
   - No flushSync-based scroll correction strategy.
   - Exact bottom on first paint is hard requirement.

7. **Performance validation doctrine**
   - Use production build traces as authority.
   - Manual profiler workflow only in this phase.

8. **Hard performance gates**
   - menu/toggle INP p75 <= 100ms,
   - thread-open interaction INP p75 <= 200ms.

9. **Canonical perf fixture**
   - 400 messages, ~30% codeblock-heavy content.

10. **Mobile constraints**
   - keep Persisted + Sheet + current sidebar primitive stack.
   - no fallback path (must stabilize single path).

## Testing Decisions

1. **Test philosophy**
   - Validate external behavior and perf outcomes; do not couple to implementation internals.

2. **Verification mode (this phase)**
   - Manual profiler only.
   - `pnpm run check-types` for each implementation step.

3. **Mandatory QA scenarios**
   - heavy fixture: open context menu repeatedly while conversation is visible,
   - heavy fixture: open/close drawer/dialog,
   - heavy fixture: open thread and verify exact bottom on first paint,
   - mobile: long sidebar scroll, repeated loadMore, no empty gaps,
   - streaming: no unsolicited viewport movement,
   - submit: exact bottom without post-paint correction.

4. **Pass criteria**
   - all hard gates met,
   - no visual instability,
   - no infinite/loadMore deadlock on mobile sidebar.

## Out of Scope

1. Full UI redesign.
2. Non-essential feature additions unrelated to perf/reliability.
3. Broad component-library migration beyond approved contingency scope.
4. New fallback runtime modes for virtualized/non-virtualized switching.

## Further Notes

1. This PRD prioritizes architecture quality over patchy compensations.
2. Any new workaround requiring retry loops or forced sync updates should be rejected unless proven unavoidable with evidence.
3. Convergence is phased: each phase must hit gates before moving to next.

## Unresolved Questions

- none
