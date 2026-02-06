# PRD: Message Footer Composable Lists (Actions + Infos)

## Problem Statement

The current message footer is a placeholder. It has hardcoded actions and limited infos. It does not support the real interaction matrix we need:
- custom inline action components,
- tier-based responsive collapsing,
- parity between inline and More states,
- submenu-rich overflow interactions,
- info rows that can be compact inline but detailed in More.

Prior attempts trended toward heavy config and leaky abstractions. We need a simpler, stricter system that keeps composition power while avoiding over-engineering.

## Solution

Implement one reusable footer list architecture with three L2 modules:
1. `ResponsiveOverflowList` (generic orchestration primitive)
2. `ActionList` (thin semantic wrapper)
3. `InfoList` (thin semantic wrapper for infos)

This keeps one shared responsive engine and two domain wrappers. L3 footer components compose these wrappers with custom inline nodes and custom overflow/detail nodes.

Key decisions:
- no discriminated unions for now,
- dropdown overflow only for v1,
- runtime validation for invalid item shapes,
- explicit overflow source policy per wrapper:
  - ActionList: collapsed-only items in More,
  - InfoList: all infos in More, detailed format preferred.

## User Stories

1. As an end user, I want primary actions always visible, so common actions are immediate.
2. As an end user, I want secondary actions visible on desktop but collapsed on mobile, so mobile stays clean.
3. As an end user, I want tertiary actions always in More, so footer remains uncluttered.
4. As an end user, I want advanced actions reachable from More, so mobile does not lose capability.
5. As an end user, I want submenu actions in More, so complex actions remain usable.
6. As an end user, I want action disabled states consistent inline and in More, so behavior is predictable.
7. As an end user, I want info chips compact inline, so message layout remains minimal.
8. As an end user, I want More infos to be detailed, so I can inspect metrics deeply.
9. As an end user, I want total time breakdown in More, so I can understand timings.
10. As an end user, I want keyboard-safe navigation in More menus, so I can use footer without mouse.
11. As an end user, I want no layout jump caused by footer list changes, so reading stays smooth.
12. As a developer, I want one shared responsive primitive, so logic is centralized and reusable.
13. As a developer, I want ActionList and InfoList wrappers thin, so they stay understandable.
14. As a developer, I want to pass custom inline components, so specialized action UIs stay possible.
15. As a developer, I want optional custom detail rows for infos, so More can be richer than inline.
16. As a developer, I want compile-time-light but runtime-safe validation, so API remains simple without silent misuse.
17. As a developer, I want stable message footer public integration points, so refactor does not ripple through app code.
18. As a developer, I want exhaustive examples in demo page, so contributors can implement safely.

## Implementation Decisions

### 1) Scope and Boundaries

In scope:
- Footer list architecture only (actions + infos).
- Migration from placeholder footer internals to composable lists.
- Demo examples covering full required behavior matrix.

Out of scope for this PRD execution:
- reasoning system,
- status system,
- backend metadata contract changes,
- non-dropdown overflow renderer.

### 2) Locked Responsive Behavior

Rules are fixed:
- Desktop (`>= 768px`): primary + secondary inline, tertiary in More.
- Mobile (`< 768px`): primary inline, secondary + tertiary in More.

Order rule:
- preserve declaration order inside each tier.

### 3) Shared L2 Architecture

`ResponsiveOverflowList` responsibilities:
- partition items by tier and breakpoint,
- orchestrate inline region,
- orchestrate More trigger and dropdown content,
- expose policy switch controlling what More receives.

`ResponsiveOverflowList` non-responsibilities:
- no action business meaning,
- no info business meaning,
- no callback semantics.

`ActionList` responsibilities:
- wraps base primitive,
- applies action-oriented defaults,
- provides helper menu primitives for overflow row/submenu composition,
- uses More policy `collapsed-only`.

`InfoList` responsibilities:
- wraps base primitive,
- applies info-oriented defaults,
- supports compact inline + detailed More rows,
- uses More policy `all-items`.

### 4) Item Contract (No Union Version)

Single minimal shape for both wrappers:
- `id` (string, stable unique key per list)
- `tier` (`primary | secondary | tertiary`)
- `inline` (optional node)
- `overflow` (optional node)
- `details` (optional node, infos only)
- `hidden` (optional boolean)
- `disabled` (optional boolean)

Wrapper runtime validation (dev mode warnings):
- ActionList:
  - primary requires `inline`
  - secondary requires `inline` and `overflow`
  - tertiary requires `overflow`
- InfoList:
  - primary requires `inline`
  - secondary requires `inline`
  - tertiary requires `details` or `inline`

Fallback rules:
- InfoList More row content resolves as `details` if provided, else `inline`.
- ActionList has no auto-fallback from inline to overflow.

### 5) Overflow Source Policy

Base primitive supports policy input:
- `collapsed-only`: More contains only items not inline in current viewport.
- `all-items`: More contains all visible logical infos regardless of inline visibility.

Wrapper mapping:
- ActionList -> `collapsed-only`
- InfoList -> `all-items`

### 6) Interaction Model

Inline side:
- fully custom component composition allowed (button, menu trigger, context behavior, tooltip).

More side:
- custom dropdown rows/submenus allowed.
- nested submenu support required for advanced actions.

Parity policy:
- any advanced capability exposed inline and not always visible across viewports must be reachable from More.

### 7) Accessibility

- More uses shadcn/radix dropdown primitives and keyboard defaults.
- trigger has aria-label and focus-visible state.
- submenu navigation must be keyboard reachable.
- disabled state must be mirrored between inline and More content.

### 8) Performance Guardrails

- L3 must memoize item arrays with minimal dependencies.
- L3 must memoize handlers passed into inline/details/overflow nodes.
- L2 partitioning must be pure and memoizable.
- rows keyed by stable ids only.
- avoid rebuilding large transient node trees each render.

### 9) Integration Contract with Existing Message Footer

Keep current integration points stable:
- `MessageFooterAssistant`
- `MessageFooterUser`

Change only internal composition from hardcoded placeholder rows to new wrappers.

### 10) Demo Contract (Mandatory Coverage)

Actions scenarios:
1. simple click action,
2. click-submenu action,
3. click default + variant submenu parity,
4. model-aware retry submenu,
5. disabled action while streaming,
6. secondary action desktop-inline/mobile-More,
7. tertiary action always More,
8. nested submenu depth 2.

Infos scenarios:
1. compact inline model info (`icon + modelId`),
2. compact inline speed (`icon + tok/s`),
3. compact inline total duration,
4. More detailed total-duration breakdown,
5. tooltip-capable inline info,
6. missing metadata hides only missing info rows.

Mixed scenarios:
1. assistant footer with both actions and infos,
2. user footer with actions only,
3. desktop/mobile toggle parity check,
4. long labels/icons clipping and width behavior.

## Testing Decisions

Testing principle:
- test observable behavior and contracts, not implementation internals.

Unit tests (required):
- tier partition function by viewport,
- overflow source policy behavior (`collapsed-only`, `all-items`),
- declaration order stability,
- resolver fallback behavior for InfoList (`details` then `inline`).

Component interaction tests (required):
- More trigger visibility and open/close,
- submenu interaction,
- keyboard navigation basic path,
- disabled behavior parity,
- wrapper validation warnings in dev for invalid item shapes.

Manual QA checklist (required):
- all demo scenarios listed above,
- no layout shift/regression in footer footprint,
- mobile parity for advanced actions.

## Out of Scope

- Discriminated-union API hardening (future upgrade path).
- Non-dropdown overflow renderer.
- Global i18n redesign.
- Reasoning/status feature redesign.

## Further Notes

- This PRD is authoritative for footer composable lists.
- If older temporary notes conflict, this PRD wins.
- It is intentionally self-contained to allow autonomous implementation without prior conversation context.

## Rollout Plan

1. Implement base primitive and pure partition logic.
2. Implement ActionList and InfoList wrappers.
3. Migrate assistant/user footer internals to wrappers.
4. Add exhaustive demo scenarios.
5. Add tests and validation warnings.
6. Remove obsolete placeholder-only list internals.

## Definition of Done

- Footer internals fully use `ResponsiveOverflowList`, `ActionList`, and `InfoList`.
- Locked responsive rules are respected exactly.
- Actions More uses collapsed-only policy.
- Infos More uses all-items policy with details fallback.
- Demo covers full required matrix.
- Tests cover partitioning, policy, ordering, interaction, and validation.
- Existing message footer entry points remain stable.
