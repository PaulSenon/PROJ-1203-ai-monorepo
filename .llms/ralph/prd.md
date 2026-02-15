# PRD - Streamdown hardening after v2 migration

## Problem Statement

First PRD (streamdown upgrade) is implemented, but runtime QA found regressions/blockers:

- code blocks can be unreadable in dark theme
- code block overflow can clip outside viewport in real chat route
- code blocks introduce load-time layout shift (initial bottom anchor not exact)
- editor/LSP reports `linkSafety` prop errors while `check-types` passes
- streaming contract clarity needed: text parts vs reasoning parts
- KaTeX dependency fix needed dedicated history step

We need a second PRD to harden behavior, keep MVP scope tight, and continue RALPH loop with one small commit per iteration.

## Solution

Run a strict hardening track focused on markdown rendering correctness only.

- Keep Streamdown v2 stack (no renderer swap)
- Keep user-requested animation/caret config exactly:
  - `animated={{ animation: "slideUp", duration: 200, easing: "ease-out", sep: "word" }}`
  - `caret="circle"`
- Keep animation effective for streaming content only (`isAnimating` driven)
- Ensure code rendering is readable in both themes using Streamdown-supported light/dark theme tuple
- Ensure no load-time CLS for code blocks (acceptance: initial conversation scroll anchor lands exactly at bottom)
- Ensure overflow containment is correct in real chat surface, not only demo
- Ensure IDE typing parity for `linkSafety`

## User Stories

1. As a chat user, I want code blocks readable in dark theme, so that I can parse responses.
2. As a chat user, I want code blocks readable in light theme, so that theme switching does not break readability.
3. As a chat user, I want long code lines to scroll inside the code block, so that content never clips outside the viewport.
4. As a chat user, I want wide markdown tables contained inside the message container, so that layout remains stable.
5. As a chat user, I want initial open to land exactly at bottom, so that no hidden CLS disrupts chat position.
6. As a chat user, I want syntax highlighting to appear without visible reflow, so that streaming feels stable.
7. As a chat user, I want text animation only while message streams, so that settled history stays calm.
8. As a chat user, I want caret shown only during streaming, so that completion state is clear.
9. As a developer, I want text-part streaming source explicit, so that no one incorrectly uses missing `part.state` on text.
10. As a developer, I want reasoning-part streaming source explicit, so that reasoning logic remains correct.
11. As a developer, I want editor and CI to agree on Streamdown props, so that local feedback is trustworthy.
12. As a maintainer, I want the new hardening scope captured in a dedicated PRD commit, so git history explains why second iteration exists.
13. As a maintainer, I want one small change per iteration, so regression isolation stays easy.
14. As a maintainer, I want Streamdown reference checks sourced from `.llms/git-references/streamdown` via sub-agent, so decisions stay aligned with current upstream source.

## 'Polishing' Requirements

- Verify code block foreground/background contrast in both themes with real model outputs
- Verify controls/icons in code blocks remain visible in both themes
- Verify no horizontal page clipping at pre-sidebar-collapse desktop width and mobile width
- Verify external-link modal behavior still works (same-origin bypass, external modal)
- Verify stream animation cadence feels natural with `duration: 200`
- Verify no debug styling/noise remains in message parts
- Verify initial scroll-to-bottom test is exact with code blocks present

## Implementation Decisions

- Streaming contract:
  - text parts use message-level `metadata.liveStatus`
  - reasoning parts use `part.state === "streaming"`
- Preserve current animation+certain UX choices exactly as requested:
  - `animated={{ animation: "slideUp", duration: 200, easing: "ease-out", sep: "word" }}`
  - `caret="circle"`
- Theme handling follows Streamdown model:
  - use dual code theme tuple `[light, dark]`
  - rely on CSS dark/light switching path; avoid ad-hoc token recompute hacks
- CLS policy is strict:
  - objective: zero load-time CLS impact for code blocks
  - no height-estimation hacks, no fake placeholders that change footprint later
  - prefer shape-stable render path (raw code footprint stable, colorization upgrade without reflow)
- Overflow containment policy:
  - enforce `min-w-0` chain where needed
  - keep horizontal overflow inside markdown primitives (`pre`, table wrappers), not page container
- Typing parity policy:
  - type Streamdown config objects explicitly (especially `linkSafety`) to align IDE + tsc behavior
- Process policy:
  - dedicated commit for this new PRD
  - each follow-up iteration = one atomic change + `pnpm run check-types`

### Atomic Task Queue (for RALPH loop)

1. Commit-only step: commit this PRD as new plan baseline.
2. Cleanup step: remove temporary debug wiring in message parts.
3. Contract step: make streaming-source split explicit in naming/flow.
4. Theme step: wire explicit Streamdown light/dark code theme tuple.
5. Overflow step: fix containment in real chat route.
6. Stability step: eliminate visible code-block load shift under strict zero-CLS acceptance.
7. Typing step: enforce `linkSafety` typing parity for IDE + CI.
8. Demo step: add explicit controls to validate text streaming/static behavior parity.
9. QA step: run checks + manual matrix, log remaining blockers only.

## Testing Decisions

- Good tests assert external behavior only (rendered readability, overflow behavior, stable anchor/position, prop typing), not internals.
- Type safety gate each iteration with `pnpm run check-types`.
- Manual QA remains required for visual/scroll/CLS checks in real chat route.
- Prior art:
  - existing component demo route for message parts behavior exploration
  - existing chat route for true container/scroll behavior verification
- If automated tests added later, focus on:
  - theme readability class/token outputs
  - overflow class contracts on markdown containers
  - linkSafety prop typing smoke

## Out of Scope

- full ai-elements registry rewrite
- replacing Streamdown renderer
- changes to prompt-input/model-selector/sidebar architecture not required for markdown correctness
- speculative performance rewrites unrelated to observed markdown regressions

## Further Notes

- Source-of-truth for upstream Streamdown behavior during this PRD: `.llms/git-references/streamdown` (browse via sub-agent only).
- Current published versions verified at planning time:
  - `streamdown@2.2.0` (latest)
  - `@streamdown/{code,mermaid,math,cjk}@1.0.2` (latest)
- Previous PRD implemented core migration. This PRD is intentionally a hardening follow-up from user runtime feedback.
- Commit message convention stays `RALPH:` prefixed.

## Unresolved Questions

- none
