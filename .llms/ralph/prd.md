## Problem Statement

The current sidebar implementation mixes app-aware logic and app-agnostic UI concerns, which breaks the intended 3-layer architecture and makes the sidebar hard to evolve safely.

From a user perspective, this creates risk on three fronts:

1. Feature velocity risk: small changes in thread items, menus, or mobile behavior require touching tightly coupled code.
2. UX regression risk: context menu, tooltip, keyboard/mobile interactions, and hover behaviors are fragile because they are intertwined with data and routing logic.
3. Performance risk: large thread lists rely on a "fake lazy mount" pattern that increases complexity and does not represent the long-term optimization strategy.

We need a refactor that preserves current behavior and visuals, improves maintainability, and introduces a cleaner performance strategy that is virtualization-ready without implementing full virtualization yet.

## Solution

Refactor the sidebar into a strict layered design with:

- Two independent L2 design-system modules:
  - `Sidebar.*` for shell/layout composition.
  - `SidebarItem.*` for item-level composition.
- L3 chat-sidebar modules that own all app concerns: data fetching, route awareness, business actions, mobile auto-close rules, and app-specific composition.
- Removal of fake lazy loading based on content-visibility events and `Activity`; keep CSS-level list optimizations and replace with simpler, predictable optimizations (stable props, targeted memoization, deferred updates, low-cost row structure).
- Dedicated component demo pages for:
  - Full sidebar behavior and composition.
  - Sidebar item stress/a11y/perf behavior.

This preserves UI behavior while making the codebase easier to reason about, safer to iterate, and ready for future virtualization.

## User Stories

1. As a chat user, I want the sidebar to look and behave exactly as before, so that refactoring does not disrupt my workflow.
2. As a keyboard user, I want to open thread options and execute actions without a mouse, so that navigation remains accessible.
3. As a touch/mobile user, I want thread options and sidebar open/close behavior to remain reliable, so that mobile UX parity is preserved.
4. As a user browsing many threads, I want scrolling to remain smooth, so that large history lists stay responsive.
5. As a user switching chats, I want mobile sidebar auto-close behavior to stay correct, so that selected content is immediately visible.
6. As a user, I want thread active state and title rendering to remain accurate, so that I can quickly orient in history.
7. As a user, I want quick actions to appear consistently on desktop hover/focus, so that common actions are efficient.
8. As a user, I want context menus to be positioned and navigated correctly, so that actions are discoverable and usable.
9. As a user, I want tooltip behavior to remain non-intrusive and accessible, so that hints help without blocking interaction.
10. As a user, I want loading and live-status indicators to stay clear and consistent, so that I understand thread state.
11. As a product engineer, I want app logic removed from design-system modules, so that reusable UI remains app-agnostic.
12. As a product engineer, I want item composition isolated from shell composition, so that item complexity does not bloat shell code.
13. As a product engineer, I want routing and business actions centralized in app-layer adapters, so that behavior changes are made in one place.
14. As a product engineer, I want explicit contracts between L2 and L3, so that cross-layer dependencies are obvious and safe.
15. As a product engineer, I want a predictable optimization strategy, so that performance changes are measurable and maintainable.
16. As a product engineer, I want to avoid premature full virtualization in this refactor, so that scope stays focused and shippable.
17. As a product engineer, I want a clear virtualization integration seam, so that future implementation is low-risk.
18. As a reviewer, I want architecture compliance to be explicit, so that layer violations are easy to detect.
19. As a QA engineer, I want dedicated demo pages for shell and item behaviors, so that manual verification is fast and repeatable.
20. As a QA engineer, I want large-list stress scenarios in demos, so that regressions are visible before release.
21. As a designer, I want no visual regressions in spacing, overlays, and glass-edge details, so that quality remains consistent.
22. As a tech lead, I want a migration that avoids touching legacy lower-layer primitives unless critical, so that risk is controlled.
23. As a maintainer, I want module responsibilities documented in one PRD, so that future contributors can follow the design intent.
24. As a maintainer, I want out-of-scope boundaries clear, so that this refactor does not turn into feature creep.

## 'Polishing' Requirements

- Confirm visual parity for header/footer overlays, spacing, and thread row density on desktop and mobile.
- Confirm keyboard flow: focus visibility, menu trigger, menu navigation, action execution, and focus return.
- Confirm touch/mouse parity for context menu and action buttons.
- Confirm tooltip behavior does not interfere with tap targets or menu interactions.
- Confirm active-thread highlighting and navigation transitions remain correct.
- Confirm large-list scrolling remains smooth and avoids noticeable jank.
- Confirm no accidental behavior changes to placeholder thread actions.
- Confirm demo pages cover happy path, dense list path, and edge states.

## Implementation Decisions

- **Architecture split**
  - Use two L2 modules:
    - Sidebar shell module (`Sidebar.*`) for container/layout concerns.
    - Sidebar item module (`SidebarItem.*`) for item composition concerns.
  - Keep both modules app-agnostic: no app hooks, no app domain types, no app routing.
  - Canonical shell module path for this refactor is `components/ui-custom/sidebar/sidebar-shell.tsx`.
  - `components/ui-custom/sidebar/sidebar.tsx` is legacy transitional surface and must not be used by new/reworked sidebar callsites.

- **L3 ownership**
  - L3 chat-sidebar owns all app concerns:
    - Data acquisition, filtering, pagination, deferred update strategy.
    - Route-aware active state and navigation links.
    - Business actions (pin/rename/share/delete semantics and callbacks).
    - Mobile auto-close behavior on thread changes.
    - App-specific shell composition (header controls, profile footer, floating actions).

- **Performance strategy update**
  - Remove fake lazy-mount mechanism based on content-visibility state-change events and `Activity` toggling.
  - Keep CSS-level row optimization (`content-visibility`, containment, intrinsic size hints).
  - Use lower-complexity optimizations:
    - Stable mapped row props from L3.
    - Targeted memoization at row boundaries.
    - Avoid per-render inline allocations in hot paths where practical.
    - Deferred/non-urgent list updates where helpful.
  - Prepare explicit render-strategy seam so virtualization can be introduced later with minimal L2 churn.

- **Legacy guardrail**
  - Keep existing legacy sidebar base untouched unless a critical blocker is found.
  - If a critical blocker is discovered, pause and request approval before modifying legacy internals.

- **Behavior parity rules**
  - Preserve current visual language and interaction model.
  - Preserve existing placeholders and no-op action semantics unless explicitly changed by follow-up scope.
  - Preserve accessibility behavior for context menus/tooltips across keyboard, mouse, and touch.

- **Demo strategy**
  - Provide two demos:
    - Full sidebar integration demo.
    - Sidebar item stress/a11y/perf demo.
  - Demos are for manual QA and architecture verification, not production behavior changes.

- **Migration sequencing**
  - Step 1: Define L2 contracts and namespace APIs.
  - Step 2: Move app-aware item logic into L3 adapters.
  - Step 3: Recompose full sidebar in L3 using L2 APIs.
    - Acceptance criteria:
      - `chat/sidebar/sidebar-layout.tsx` composes sidebar from `ui-custom/sidebar/sidebar-shell.tsx` (+ `SidebarItem.*` consumers).
      - No import of `ui-custom/sidebar/sidebar.tsx` in L3 sidebar adapter/layout or sidebar demos.
      - Data/pagination/deferred/mobile-autoclose concerns live in L3 (`chat/sidebar/*`).
  - Step 4: Remove old fake lazy logic and validate perf baseline.
  - Step 5: Replace/extend demo coverage and run QA checklist.

## Testing Decisions

- **What makes a good test**
  - Validate external behavior and user-observable outcomes.
  - Avoid asserting implementation details (internal hooks, memo internals, class micro-details not tied to behavior).
  - Prefer intent-based tests: interaction, state transitions, accessibility semantics.

- **Modules to test**
  - L2 Sidebar shell module:
    - Slot composition and accessibility-relevant structure.
    - Inset/header/footer behavior contracts.
  - L2 Sidebar item module:
    - Item composition contracts, action/menu rendering behavior, keyboard trigger behavior.
  - L3 chat sidebar adapter/layout:
    - Data-to-view mapping, active item resolution, load-more triggering, mobile auto-close.
  - Demo-level manual verification:
    - Dense list scenarios, interaction parity, visual regression checks.

- **Prior art expectations**
  - Follow existing component testing conventions already used for composable UI modules and route-level component demos.
  - Reuse established testing style for accessibility and interaction assertions where available.

## Out of Scope

- Implementing full list virtualization in this iteration.
- Changing product behavior of thread actions beyond architectural relocation.
- Redesigning visual style, branding, or introducing new sidebar features.
- Broad rewrites of legacy lower-layer sidebar internals.
- Cross-feature refactors unrelated to sidebar and sidebar-item architecture.

## Further Notes

### Target directory layout (annotated)

```text
components/
  ui-custom/
    sidebar/
      sidebar-shell.tsx           # L2 Sidebar.* shell/layout composition (canonical)
      sidebar.tsx                 # legacy transitional file (do not import in refactor path)
      sidebar-item.tsx            # L2 SidebarItem.* item composition
  chat/
    sidebar/
      sidebar.tsx                 # L3 adapter: app hooks/data/actions wiring
      sidebar-layout.tsx          # L3 pure composition of full sidebar
      _parts/
        thread-item.tsx           # L3 thread adapter -> SidebarItem.*
        thread-item-actions.tsx   # L3 business action definitions/callbacks
        sidebar-floating-actions.tsx # L3 floating controls composition
        sidebar-user-footer.tsx   # L3 app-aware footer content
      _hooks/
        use-sidebar-threads.ts    # L3 list/query/deferred/pagination shaping
        use-thread-item-state.ts  # L3 thread->view-state mapping
        use-mobile-sidebar-autoclose.ts # L3 mobile close-on-navigation
routes/components/_components/
  sidebar.tsx                     # Full sidebar demo page
  sidebar-thread-item.tsx         # Item stress/a11y/perf demo page
```

### Virtualization-ready seam (no implementation yet)

Define a list-render strategy boundary in L3 so future virtualization can replace only list rendering orchestration while preserving L2 `SidebarItem.*` contracts and item composition.

### Risk notes

- Main risk is subtle interaction regression in context menu/tooltip/focus behavior.
- Mitigation is explicit parity checklist and dedicated demo pages focused on interaction states.

### Post-final QA feedback to remediate before ship (2026-03-02)

- Mobile options trigger visibility: on mobile, thread options trigger must remain available for keyboard/screenreader navigation but the visible three-dots affordance should not be shown by default touch UI.
- Header/footer backdrop responsiveness: top/bottom backdrop edge effect should toggle immediately on probe state changes (no noticeable delay).
- Load-more responsiveness: pagination trigger must keep up with fast scrolling near list bottom and avoid debounce-like perceived delay.
- Mobile context-menu action bug: selecting a non-navigation context-menu action on mobile must not close the sidebar; auto-close remains navigation-only.

### Unresolved questions

- None.
