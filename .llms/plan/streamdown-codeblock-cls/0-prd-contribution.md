# PRD — Streamdown Contribution: Code Block CLS Elimination via Lower Lazy Boundary

## Problem Statement

Streamdown code blocks currently lazy-load the whole code block component behind a Suspense fallback spinner. On cold/slow loads, users first see a generic loader shell, then a full code block shell with actual code lines. The shell swap changes perceived geometry and causes visible layout movement (CLS-like jump), especially when many fenced blocks exist in one message/page.

This behavior is a UX/perf gap in default usage. Integrators should not need to override core components to get stable code block rendering.

## Solution

Move the lazy boundary down one layer:

1. Render the full code block shell synchronously (container + header + body) for first paint.
2. Keep only the highlighting logic lazy-loaded in a new small component.
3. Use the same shared `CodeBlockBody` for both fallback and highlighted render paths.
4. Fallback renders real plain text tokens immediately (unstyled/monochrome), then upgrades to highlighted tokens after lazy module + async highlight resolve.

Net effect: heavy logic still lazy; initial render is stable, readable, and shell-identical.

## User Stories

1. As a reader, I want code to appear immediately as text, so that I can start reading without waiting for highlight initialization.
2. As a reader, I want surrounding content to stay stable while code highlighting loads, so that the page does not jump.
3. As a reader, I want syntax colors to appear progressively without changing block shape, so that transitions feel smooth.
4. As a developer using Streamdown defaults, I want this behavior out of the box, so that I do not need custom component overrides.
5. As a developer, I want code block shell styling defined once, so that fallback and final render cannot drift visually.
6. As a maintainer, I want heavy highlighting logic isolated in one lazy module, so that bundle boundaries stay explicit.
7. As a maintainer, I want non-highlight shell code free of heavy runtime imports, so that lazy loading remains effective.
8. As a maintainer, I want existing copy/download controls to keep working, so that no interaction regressions happen.
9. As a maintainer, I want no hydration regressions with block code in markdown paragraphs, so that SSR/CSR consistency remains intact.
10. As a maintainer, I want clear tests for fallback behavior and upgrade behavior, so that future refactors do not reintroduce layout-jump patterns.
11. As a maintainer, I want default behavior to work with and without the code plugin, so that plain text fallback remains robust.
12. As a maintainer, I want contribution scope limited to code-block loading architecture, so that review remains focused and fast.

## 'Polishing' Requirements

1. Ensure fallback and highlighted DOM structure are shell-identical at container/header/body level.
2. Ensure fallback keeps language label and body spacing identical to highlighted path.
3. Ensure no spinner icon appears for standard code blocks during lazy highlight load.
4. Ensure code remains copyable and downloadable once controls are enabled.
5. Ensure dark/light theme switch after highlight resolve does not flash different geometry.
6. Ensure trailing newline trimming behavior stays identical between fallback and highlighted output.
7. Ensure docs/changelog wording is precise: fix is for visual stability during lazy highlight load.

## Implementation Decisions

1. **Boundary placement**
   - Remove top-level lazy loading of the entire code block renderer.
   - Render code block shell synchronously in the markdown code component path.
   - Introduce a lower internal lazy boundary specifically around highlighting logic.

2. **New deep module split**
   - Create a small lazy-highlight module whose single responsibility is: subscribe/resolve highlighted tokens and render via shared body primitive.
   - Keep shell orchestration in the synchronous code block module.

3. **Shared body primitive reuse**
   - Reuse `CodeBlockBody` for both states:
     - fallback state: raw/plain tokens
     - resolved state: highlighted tokens
   - Do not introduce a second visual body implementation.

4. **Dependency isolation**
   - Keep heavy/highlighter-related runtime imports inside lazy-highlight module only.
   - Keep synchronous shell module free of heavy runtime imports and plugin-specific runtime work.
   - Use type-only imports where needed; avoid runtime leakage.

5. **Fallback semantics**
   - Fallback shows immediate raw text tokens generated from trimmed code.
   - Fallback is not a loader/skeleton; it is functional readable content.
   - Highlight upgrade is progressive enhancement, not structural replacement.

6. **State/update contract**
   - Initial result is raw tokens.
   - If cached highlight exists, swap tokens quickly with minimal repaint.
   - If async highlight resolves later, update tokens in place within same body primitive.

7. **Contribution scope**
   - Include docs note and patch changeset for package release process.
   - Keep PR narrowly scoped to code block loading architecture + tests.

## Testing Decisions

1. **Testing principle**
   - Test external behavior and stability contracts, not internal implementation details.
   - Prefer assertions on user-visible DOM and data attributes.

2. **Modules to test**
   - Markdown code rendering path (sync shell render).
   - Code block fallback path (plain text body appears immediately).
   - Lazy highlight upgrade path (same block persists; content styling upgrades).
   - Existing hydration safeguards (block code not wrapped in invalid paragraph contexts).

3. **Required automated tests**
   - New test: code block renders readable text immediately on first render (before lazy highlight resolves).
   - New test: no spinner fallback appears for standard code blocks.
   - New test: container/header/body data attributes exist in fallback path.
   - New test: line count/trailing newline behavior unchanged between fallback and highlighted path.
   - Update existing hydration tests where assumptions depended on top-level lazy code block boundary.

4. **CLS-specific validation strategy**
   - Unit tests cannot reliably measure real CLS in jsdom (no layout engine).
   - Add proxy stability assertions:
     - same shell nodes persist across fallback->highlight transition
     - no fallback loader insertion/removal in code block path
     - same body primitive used both phases
   - Add manual browser validation checklist in PR:
     - cold cache + network throttle
     - capture Performance trace Layout Shift entries before/after
     - provide before/after video evidence in PR description.

5. **Prior art for tests**
   - Reuse existing code block and hydration test structure/style from current package tests.
   - Extend existing suites instead of introducing new test framework.

## Out of Scope

1. Changing markdown parsing behavior.
2. New controls/features for code blocks.
3. Theme redesign or typography changes.
4. New plugin API contracts.
5. Global performance initiatives unrelated to code-block loading boundary.

## Further Notes

1. This contribution intentionally optimizes visual stability first while preserving lazy loading for heavy highlight work.
2. The architecture aims to reduce maintenance risk by centralizing shell styling and avoiding duplicate fallback UI implementations.
3. PR should include concise perf narrative:
   - what boundary moved
   - why this reduces visible shift
   - why heavy deps remain lazy.
4. Release metadata should use patch bump policy and include behavior-focused changelog text.

## Acceptance Criteria

1. Code block shell renders synchronously without loader-only fallback.
2. Highlighting logic remains lazy-loaded behind internal boundary.
3. Fallback uses same `CodeBlockBody` as highlighted path.
4. No heavy runtime dependencies leak into synchronous shell path.
5. Tests cover immediate text render, no spinner fallback, and transition stability proxies.
6. Manual browser validation confirms visible layout jump materially reduced/eliminated under throttled cold load.

## Unresolved Questions

- none
