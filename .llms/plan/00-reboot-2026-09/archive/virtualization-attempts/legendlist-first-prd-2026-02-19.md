# PRD - LegendList Web Virtualization (Sidebar + Conversation)

## Problem Statement

Chat UX currently relies on:

- Sidebar fake virtualization (CSS/content-visibility + activity hiding), not true windowing.
- Conversation full render map, no true virtualization.

At scale this risks:

- scroll jank,
- degraded INP on interactive paths,
- fragile behavior during live updates and long threads.

Goal is a fast, smooth chat that does not visibly feel virtualized, while preserving current layout and interaction behavior.

## Solution

Adopt LegendList web for virtualization in two tracks:

1. **Sidebar first (simplest path)**
   - Replace fake virtualization with true virtual list.
   - Keep existing load-more behavior wired.
   - Preserve current visual output and interactions.

2. **Conversation second**
   - Replace message mapping with true virtual list.
   - Preserve all current layout rules exactly, especially last-assistant reserve behavior.
   - Keep current checkpoint model (checkpoint currently placed at bottom), while structuring adapter for future true last-read anchor.
   - Add placeholder load-more callback position for older history integration, but do not wire fetching yet in this PRD scope.

Rollout principle:

- implement simplest first,
- no visible layout drift,
- no behavior regressions.

## User Stories

1. As a chat user, I want the sidebar to remain smooth with many threads, so that navigation stays instant.
2. As a chat user, I want conversation scrolling to stay fluid with long message history, so that reading remains effortless.
3. As a chat user, I want streaming updates to not cause scroll jumps, so that context is stable.
4. As a chat user, I want prepending older content to preserve viewport position, so that I do not lose reading location.
5. As a chat user, I want bottom-follow behavior to remain natural when near latest, so that live chat feels responsive.
6. As a chat user, I want the scroll-to-latest control to behave exactly as before, so that navigation muscle memory is preserved.
7. As a chat user, I want the message composer and sticky input area to behave unchanged, so that typing flow is not disrupted.
8. As a chat user, I want the last assistant reserve space behavior unchanged, so that streaming space expectations stay consistent.
9. As a chat user, I want mobile and desktop to both feel stable, so that device choice does not degrade UX.
10. As a chat user, I want opening a conversation to follow checkpoint anchor semantics, so that future last-read anchor remains possible.
11. As a developer, I want sidebar virtualization first, so risk is reduced before conversation changes.
12. As a developer, I want minimal-invasive integration, so existing message/thread UI components remain reusable.
13. As a developer, I want clear adapter boundaries between app logic and virtual list mechanics, so future maintenance is simpler.
14. As a developer, I want existing pagination wiring in sidebar to remain intact, so data behavior does not regress.
15. As a developer, I want conversation older-load callback shape defined now, so later wiring is straightforward.
16. As a developer, I want key stability guarantees, so recycled/moved rows do not flicker or remount unexpectedly.
17. As a developer, I want deterministic tuning knobs, so perf optimization is systematic and repeatable.
18. As a reviewer, I want no visible layout delta, so virtualization is transparent to end users.
19. As a maintainer, I want feature-flag rollout option, so beta-library risk is controlled.
20. As a maintainer, I want behavior-focused tests for anchors and scroll state, so regressions are caught early.

## 'Polishing' Requirements

1. Verify no visual changes in spacing, message composition, or sidebar row appearance.
2. Verify last-assistant reserve behavior is pixel-equivalent to previous behavior.
3. Verify scroll-to-latest button visibility and action parity.
4. Verify sidebar active item, hover actions, and context menus remain unchanged.
5. Verify no scroll jumps on stream updates near top/middle/bottom.
6. Verify no jump when prepending data in sidebar path.
7. Verify keyboard and sticky input interactions remain smooth on mobile and desktop.
8. Verify no noisy console warnings from keying, scroll handlers, or observer churn.
9. Verify high-volume datasets still feel natural and not visibly virtualized.
10. Verify app startup/open conversation does not regress perceived responsiveness.

## Implementation Decisions

1. **Library choice**
   - Use LegendList web entrypoint (`@legendapp/list/react`) for both sidebar and conversation surfaces.

2. **Rollout sequencing**
   - Implement sidebar virtualization first (simplest), then conversation virtualization.
   - Ship order is non-strict globally, but local implementation proceeds from simplest to riskier surface.

3. **Architecture boundaries**
   - Keep app-specific data hooks and business logic in feature adapters.
   - Keep virtual list wrappers app-agnostic where practical.
   - Reuse existing row/item presentation components.

4. **Behavior parity as hard constraint**
   - Preserve all existing layout behavior and interactions.
   - Preserve last-assistant reserve rule exactly.

5. **Anchor strategy decision**
   - Anchor model is checkpoint-based for open behavior.
   - Current checkpoint location remains bottom in this scope.
   - Adapter contract must remain compatible with future real last-read checkpoint placement.

6. **Conversation history loading scope**
   - Define explicit callback slot/interface for older-load trigger in conversation virtualization layer.
   - Do not wire actual data fetch yet.

7. **Sidebar pagination scope**
   - Keep sidebar load-more fully wired in virtual list integration.

8. **Core list configuration baseline**
   - Stable key extraction mandatory.
   - Accurate estimate strategy required before final perf tuning.
   - Maintain visible content position + maintain-at-end behaviors used for chat stability.

9. **Risk control**
   - Prefer feature-flagged rollout due beta web status of library.

10. **Deep modules to introduce/refine**
   - Virtual List Adapter (sidebar): translates thread dataset + callbacks to virtual list contract.
   - Virtual List Adapter (conversation): translates message dataset + scroll semantics to virtual list contract.
   - Scroll Anchor Bridge: centralizes scroll-to-bottom/checkpoint APIs over virtual list state/ref methods.
   - Reach Trigger Guard: deduplicates load-more trigger conditions to avoid repeated calls.

## Testing Decisions

1. **Good test definition**
   - Test external behavior (scroll position, anchor stability, visible controls, callbacks), not internal implementation details of virtualization internals.

2. **Modules to test**
   - Sidebar virtual adapter behavior:
     - rendering parity,
     - stable keys,
     - load-more trigger continuity.
   - Conversation virtual adapter behavior:
     - rendering parity,
     - last-assistant reserve parity,
     - scroll-to-latest parity,
     - checkpoint open behavior parity.
   - Scroll anchor bridge behavior:
     - bottom/checkpoint scroll actions,
     - is-at-bottom state coherence.
   - Reach trigger guard behavior:
     - no duplicate load triggers in continuous-edge conditions.

3. **Prior-art style guidance**
   - Follow existing component demo/testing style focused on user-observable behavior.
   - Add interaction/regression checks around current chat/siderbar UX paths instead of snapshot-heavy internals.

4. **Manual verification matrix**
   - Sidebar with very large thread list + continuous scroll.
   - Conversation with long variable-height messages.
   - Streaming updates while user near bottom.
   - Streaming updates while user away from bottom.
   - Open conversation path with checkpoint anchor semantics.
   - Mobile sticky input + keyboard interactions.

## Out of Scope

1. Full conversation older-history fetch wiring (only callback slot is in scope).
2. New visual design or spacing changes.
3. Changes to message rendering model/content components.
4. Changes to backend contracts or pagination API shape.
5. Last-read persistence product feature itself (only compatibility path retained).
6. Broad rewrite of scroll-state provider architecture beyond required adapter bridge.

## Further Notes

1. LegendList web support is beta; rollout should include quick revert path.
2. Performance tuning must be data-driven (estimate calibration first, then buffer tuning).
3. If parity and smoothness conflict, parity wins in this scope; optimization iterates afterward.
4. This PRD intentionally minimizes feature creep and prioritizes transparent virtualization.

## Unresolved Questions

- INP target value to enforce pass/fail gate?
