## Problem Statement

This PRD is a follow-up stabilization pass after the previous sidebar refactor PRD.

The previous work successfully split the sidebar into cleaner L2/L3 paths, moved app logic to L3, removed fake lazy mounting from the active path, and added dedicated demo routes. However, key follow-up issues remain:

1. Legacy sidebar code still exists and is still edited in the refactor window, increasing confusion and accidental reuse risk.
2. Pagination load-more cadence can feel delayed or trigger poorly under fast scrolling.
3. Per-row context-menu force-mounting adds avoidable DOM/render overhead in long lists.
4. Thread list rerender fanout is still higher than needed for active-row changes.
5. L3 composition can be further aligned with complex feature conventions used by message components.

From user perspective, this creates risk of subtle UX regression (scroll/pagination/menu behavior), and from maintainer perspective, it leaves architecture debt and unclear ownership.

## Solution

Finalize the sidebar refactor by hardening architecture and performance without expanding product scope:

- Remove unused legacy sidebar modules now (hard cleanup), so only canonical L2/L3 paths remain.
- Keep and formalize current bug fix allowing mobile sheet + context-menu coexistence.
- Tighten L3 composition boundaries to better match complex feature structure conventions.
- Remove force-mounted per-row context menus and rely on default lazy mount behavior.
- Implement pagination gating based on paginated query status (`CanLoadMore`, `LoadingMore`, `Exhausted`) to prevent duplicate calls while preserving fast-scroll responsiveness.
- Reduce unnecessary list rerenders (memo boundaries + stable props/contracts at hot row boundaries).
- Keep `useDeferredValue` strategy unchanged in this phase.

This pass is intentionally scope-limited: no new product behavior, no full virtualization, no skeleton-prefill pagination strategy yet.

## User Stories

1. As a chat user, I want sidebar behavior to stay consistent while internals are cleaned up, so my workflow is unchanged.
2. As a chat user with many threads, I want load-more to keep up during fast scrolling, so I do not feel list stalls near the bottom.
3. As a chat user, I want context menus to open instantly without hurting list responsiveness, so actions remain smooth in dense histories.
4. As a mobile user, I want non-navigation context-menu actions to keep the sidebar open, so I can continue browsing actions safely.
5. As a mobile user, I want overlay/outside tap dismiss behavior to still work normally, so drawer behavior stays native-feel.
6. As a keyboard user, I want thread options to remain reachable and operable, so accessibility parity is preserved.
7. As a product engineer, I want all active sidebar callsites to use canonical L2/L3 surfaces only, so architecture is unambiguous.
8. As a product engineer, I want legacy unused sidebar modules removed, so accidental imports cannot reintroduce old patterns.
9. As a product engineer, I want L2 sidebar modules to stay app-agnostic, so design-system reuse remains safe.
10. As a product engineer, I want L3 to own routing/data/actions/autoclose concerns, so behavior changes stay localized.
11. As a maintainer, I want complex sidebar composition organized like other complex features, so code navigation is predictable.
12. As a maintainer, I want thread row rerenders minimized, so performance work remains measurable and maintainable.
13. As a maintainer, I want pagination trigger logic explicit and state-driven, so duplicate fetch bugs are easy to reason about.
14. As a reviewer, I want removal of legacy modules to be explicit and complete, so no transitional ambiguity remains.
15. As a reviewer, I want architecture exceptions documented (mobile sheet/context-menu guard), so future edits do not undo critical fixes.
16. As a QA engineer, I want demo routes to continue validating full sidebar and item stress paths, so regressions are easy to catch.
17. As a QA engineer, I want clear parity checks for fast-scroll pagination cadence, so responsiveness issues are objectively evaluated.
18. As a tech lead, I want this follow-up to avoid feature creep, so delivery stays focused and shippable.
19. As a tech lead, I want deferred advanced ideas parked explicitly, so roadmap work does not leak into this refactor.
20. As a future implementer, I want this PRD to be self-sufficient, so implementation requires no hidden conversation context.

## 'Polishing' Requirements

- Confirm no remaining runtime imports to removed legacy sidebar modules.
- Confirm mobile context-menu action path keeps sidebar open for non-navigation actions.
- Confirm mobile outside tap still closes sidebar sheet as expected.
- Confirm fast-scroll bottom approach does not cause duplicate `loadMore` bursts.
- Confirm fast-scroll bottom approach does not stall when sentinel stays intersecting after a page resolves.
- Confirm thread active-state changes do not visibly jank the full list.
- Confirm desktop hover/focus quick actions and menu trigger parity remain intact.
- Confirm keyboard menu open/select/escape/focus-return flow still works.
- Confirm `/components/sidebar` and `/components/sidebar-thread-item` still cover dense-list and interaction checks.

## Implementation Decisions

- **Follow-up scope baseline**
  - This PRD is a continuation of prior sidebar refactor completion work.
  - Keep product behavior parity as default rule.

- **Legacy cleanup (hard requirement)**
  - Delete unused legacy sidebar modules that are no longer part of canonical architecture.
  - Ensure all active imports use canonical surfaces only.
  - Do not keep dual-path transitional exports after this pass.

- **Canonical architecture after cleanup**
  - L2 keeps exactly two sidebar-facing namespaces:
    - `Sidebar.*` for shell/layout composition.
    - `SidebarItem.*` for item-level composition primitives.
  - L3 owns app-aware concerns:
    - data acquisition/filtering/pagination orchestration,
    - route-aware active state/navigation,
    - thread action wiring,
    - mobile auto-close behavior.

- **L3 composition structure refinement**
  - Keep adapter + layout split for sidebar feature root.
  - Extract non-trivial layout sub-compositions into `_parts` where it improves readability and guideline compliance.
  - Preserve file naming conventions (`[feature]-layout`, `_parts`, `_hooks`) and avoid barrel exports.

- **Mobile context-menu/sheet interaction guard**
  - Keep existing mobile interaction guard that prevents sheet outside-close when interaction originates from context-menu content.
  - Treat this as an approved fix, not a temporary hack.
  - Preserve normal sheet dismiss behavior for true outside interactions.

- **Context-menu mount strategy**
  - Remove per-row forced mounting from thread item context menus.
  - Use default mount behavior to reduce hidden DOM cost in long lists.

- **Pagination cadence hardening (no feature creep)**
  - Gate `loadMore` requests using paginated status.
  - Request only when status is `CanLoadMore`.
  - No-op when status is `LoadingMore`, `LoadingFirstPage`, or `Exhausted`.
  - Implement cycle lock to avoid duplicate `loadMore` calls for same cycle.
  - Rearm automatically after status leaves `LoadingMore` so if sentinel is still intersecting, next page request can fire without extra scroll jiggle.
  - Keep current product behavior; no skeleton-prefill pagination in this PRD.

- **Rerender containment**
  - Add memoization boundary at thread item root and keep row props stable.
  - Prefer re-rendering only rows impacted by active-state or live-status/title change.
  - Avoid expanding optimization into global virtualization in this pass.

- **Deferred strategy**
  - Keep current `useDeferredValue` behavior unchanged in this PRD.
  - Cross-app deferred-value strategy review is explicitly deferred.

- **Delivery constraints**
  - No new unit/integration test suite in this pass (explicitly accepted).
  - Keep existing demos as manual verification surfaces.

## Testing Decisions

- **What makes a good test (when tests are added later)**
  - Validate user-observable outcomes and interaction contracts.
  - Avoid asserting implementation details such as internal refs/memo internals.
  - Prioritize behavior-level assertions: menu behavior, pagination cadence, active-row transitions.

- **This PRD test policy**
  - No new unit tests for this follow-up (explicit scope decision).
  - Validation remains manual via component demo routes and targeted QA checklist.

- **Manual verification focus**
  - Full sidebar route: mobile sheet/menu interaction parity, load-more cadence under fast scroll, active-row behavior.
  - Thread-item demo route: dense-list interaction behavior and quick-action/menu responsiveness.

## Out of Scope

- Placeholder/skeleton-prefill pagination strategy (optimistic slot reservation while next page loads).
- Full list virtualization implementation.
- Global app-wide deferred rendering strategy redesign.
- Broad INP optimization pass across unrelated demos/components.
- New product features or action semantics changes.
- Backend total-thread-count integration.
- New automated test suite for sidebar in this iteration.

## Further Notes

### Previous refactor recap (completed baseline)

- L3 sidebar adapter/layout split implemented.
- New L2 shell/item namespaces introduced.
- Fake lazy mount path removed from active sidebar path.
- Dedicated full sidebar and thread-item demo routes added.

### Follow-up migration sequence

1. Remove legacy sidebar modules and reconcile imports.
2. Refine L3 layout decomposition to align with complex feature conventions.
3. Remove row context-menu `forceMount` usage.
4. Implement status-gated pagination cadence with rearm behavior.
5. Add/confirm row-level memo boundaries and stable props.
6. Re-run manual QA checklist across both demo routes.

### Risks

- Main risk: introducing pagination dead-zone when preventing duplicate load-more calls.
- Mitigation: explicit status machine gating + rearm-on-status-transition behavior.

### Explicitly deferred idea (valuable, not now)

- Optimistic placeholder rows during pagination is intentionally deferred to backlog to avoid feature creep in this follow-up.

### Unresolved questions

- None.
