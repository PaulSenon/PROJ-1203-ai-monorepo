# PRD - Streamdown refinement v3 (gesture containment + demo parity)

## Problem Statement

Current streamdown upgrade works, but 4 gaps remain:

- Horizontal swipe-back gesture can still trigger while interacting with horizontally scrollable markdown regions.
- Demo page cannot control text-part streaming state, while runtime now relies on part-level state for text and reasoning.
- SmoothMarkdown now takes both `isStreaming` and `consolidate`, but contract/QA coverage is not fully specified.
- Demo long-content injector is not exhaustive enough to validate full markdown/render/security matrix after streamdown migration.

We need a narrow follow-up PRD focused on UX correctness + QA completeness, without widening MVP scope.

## Solution

Implement a scoped refinement pass:

1) Block back-swipe/navigation gesture only when touch starts inside known horizontal markdown scrollers (not the whole message surface).
2) Extend demo part model so text parts expose `streaming|done` controls like reasoning flow parity (drives `isStreaming`).
3) Add explicit message-level `consolidate` coverage in demo and document propagation contract to markdown parts.
4) Replace `Insert Long Content` with `Insert Demo Markdown` using a comprehensive fixture covering markdown/plugin surfaces used in app.
5) Keep implementation minimal, composable, and CSS-first; add JS fallback only if required by manual mobile QA.

## User Stories

1. As a mobile chat user, I want horizontal dragging inside code blocks to scroll code, so that I can read long lines.
2. As a mobile chat user, I want horizontal dragging inside wide tables to stay in-table, so that page/back navigation does not hijack interaction.
3. As a mobile chat user, I want horizontal dragging inside mermaid overflow regions to stay local, so that diagram interaction feels native.
4. As a mobile chat user, I want normal swipe-back to still work outside overflow blocks, so that system navigation remains intact.
5. As a desktop user, I want no regression in mouse/trackpad horizontal scroll behavior, so that overflow still works naturally.
6. As a developer, I want text parts in demo to toggle `streaming|done`, so that Streamdown animation/caret behavior can be validated for text parts.
7. As a developer, I want a message-level `consolidate` toggle in demo, so that I can validate render behavior across dynamic vs consolidated modes.
8. As a developer, I want reasoning parts to keep existing state controls, so that cross-part parity remains testable.
9. As a developer, I want injected demo markdown to include links/internal+external samples, so that link rendering and policy behavior remain testable.
10. As a developer, I want injected demo markdown to include code fences and inline code, so that overflow and copy controls can be tested.
11. As a developer, I want injected demo markdown to include wide tables, so that overflow containment can be tested quickly.
12. As a developer, I want injected demo markdown to include images, so that media rendering remains covered.
13. As a developer, I want injected demo markdown to include mermaid blocks, so that plugin rendering and controls stay validated.
14. As a developer, I want injected demo markdown to include KaTeX inline/block math, so that math plugin behavior remains covered.
15. As a developer, I want injected demo markdown to include CJK mixed-language text, so that CJK plugin behavior remains covered.
16. As a maintainer, I want this as a dedicated PRD refresh, so that scope/history is explicit and auditable.

## 'Polishing' Requirements

- Verify swipe-back is blocked only when gesture starts inside target horizontal scrollers.
- Verify swipe-back still works when gesture starts on regular message content/background.
- Verify code/table/mermaid horizontal scrolling remains smooth on iOS + Android.
- Verify no page-level horizontal clipping/regression introduced.
- Verify text part `streaming|done` toggle visibly changes animation/caret behavior.
- Verify `consolidate` toggle path reaches markdown parts and flips rendering mode as expected.
- Verify text/ reasoning behavior across combined matrix (`isStreaming` x `consolidate`).
- Verify `Insert Demo Markdown` reliably replaces first text part and is deterministic.
- Verify markdown fixture renders without runtime errors across light/dark.
- Verify no debug styles/noise remain in message markdown parts.

## Implementation Decisions

- **Gesture containment strategy (CSS-first):**
  - Target Streamdown overflow-prone blocks: code block, table wrapper, mermaid block.
  - Apply horizontal overscroll containment on those blocks only.
  - Do not apply containment to parent message container.
  - Keep behavior scoped to markdown-rendered overflow elements to preserve global nav gestures elsewhere.
- **Fallback strategy:**
  - Primary path is pure CSS.
  - If iOS QA still shows back-swipe leakage, add minimal local touch-boundary guard tied to targeted overflow elements only (no global document listener).
- **Demo part-state model:**
  - Text demo part gains explicit state union: `streaming | done`.
  - State controls for text mirror reasoning control pattern for parity.
  - Message construction includes text-part state field so preview reflects runtime contract and drives `isStreaming`.
- **Consolidate contract:**
  - Keep `isStreaming` and `consolidate` as distinct inputs in SmoothMarkdown contract.
  - `isStreaming` source: part-level state (`text` and `reasoning`).
  - `consolidate` source: message-level rendering context (dynamic vs consolidated surface).
  - Propagation path stays explicit: conversation/message -> content parts -> text/reasoning part -> SmoothMarkdown.
  - Demo page adds message-level control for `consolidate` so both flags are QA-visible.
- **Demo markdown fixture:**
  - Replace old `long content` fixture with a curated `demo markdown` fixture including:
    - headings, emphasis, lists, task list, blockquote, hr
    - internal link + external link samples (banned-link scenario excluded from this PRD)
    - inline code + multiple fenced code blocks with long lines
    - wide GFM table
    - image markdown
    - mermaid diagram block
    - KaTeX inline and block math
    - CJK mixed-language section
  - Action behavior: replace first text part content (existing behavior retained).
- **Scope discipline:**
  - No renderer swap.
  - No feature expansion to global link-ban simulation in demo.
  - No app-wide gesture policy changes outside markdown overflow surfaces.

## Testing Decisions

- Good tests validate user-visible behavior only (gesture containment, rendering parity, state-driven animation behavior), not internals.
- Keep type-safety gate: `pnpm run check-types`.
- Manual QA required for gesture behavior:
  - iOS Safari: edge-swipe/back behavior inside/outside target blocks
  - Android Chrome: horizontal containment sanity
  - Desktop browsers: no overflow regressions
- Demo QA matrix must cover text/reasoning state toggles, `consolidate` toggle, combined flag behavior, and full markdown fixture rendering.

## Out of Scope

- Simulating `banned link` flow in demo markdown fixture for this iteration.
- Reworking full link-policy architecture.
- Any refactor outside streamdown overflow behavior + message demo controls/content.
- New markdown plugin additions beyond already integrated stack.

## Further Notes

- Upstream Streamdown selectors validated from official styling references (`data-streamdown` element taxonomy).
- Gesture decision grounded on MDN overscroll behavior semantics (`contain` disables scroll chaining/native navigation in scoped area).
- Keep change small and atomic: one PRD refresh, then implementation slices.

## Unresolved Questions

- none
