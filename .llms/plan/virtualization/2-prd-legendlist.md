# PRD - LegendList Virtualization (Sidebar First, Conversation Second)

## Problem Statement

Chat MVP needs invisible virtualization quality, but current list strategy is split and fragile:

- Sidebar uses pseudo-virtualization (`content-visibility` + React `Activity`) instead of true range virtualization.
- Conversation renders full message list in window scroll; older-message pagination is available in data layer but not wired to UI boundary triggers.
- Scroll behavior has strict UX constraints (open behavior, submit auto-scroll, streaming growth, prepend stability) that must remain deterministic.

If we keep current approach as list sizes grow, we risk INP regressions, missed pagination triggers, and visible scroll instability.

## Solution

Adopt LegendList in 2 phases with strict anti-feature-creep scope:

1. **Phase A: Sidebar**
   - Replace pseudo-virtualization with true LegendList virtualization in existing sidebar scroll container.
   - Keep existing sidebar UX shell (header/footer overlays, mobile persisted mount behavior, deferred thread input).
   - Preserve stable behavior for active row, context menu interactions, and top insertions.

2. **Phase B: Conversation**
   - Replace plain message mapping with LegendList window-scroll virtualization.
   - Keep current business UX rules (optimistic assistant shell, reserve-space latch).
   - Add reliable top-boundary load-more for older messages.
   - Keep deterministic submit-to-bottom and stable viewport during prepend/append/stream growth.

> IMPORTANT: we skip phase A for now. We only want to do phase B (conversation virtualization.)

Library truth source for this work: local reverse-engineered LegendList source/docs already captured in project planning docs.

## User Stories

1. As a chat user, I want sidebar scrolling to stay smooth with long history, so navigation feels instant.
2. As a chat user, I want thread list pagination to always trigger at the bottom boundary, so history never gets stuck.
3. As a chat user, I want no blank holes or jump artifacts while scrolling sidebar, so UI feels native.
4. As a chat user, I want active thread highlighting and selection behavior unchanged after virtualization.
5. As a chat user, I want mobile drawer/sheet behavior unchanged, so touch UX stays consistent.
6. As a chat user, I want conversation open behavior deterministic, so I resume context immediately.
7. As a chat user, I want submit to always bring me to latest exchange, so I can follow answer flow.
8. As a chat user, I want no autonomous viewport movement when I scroll away from bottom during streaming.
9. As a chat user, I want streaming growth to avoid visual jitter, so reading stays comfortable.
10. As a chat user, I want older messages to load reliably when reaching top boundary, so full history is reachable.
11. As a chat user, I want prepend loading to preserve my current viewport position, so context does not shift.
12. As a chat user, I want scroll-to-bottom affordance behavior unchanged in intent, so controls stay predictable.
13. As a developer, I want one clear virtualization source of truth per surface, so list behavior is maintainable.
14. As a developer, I want deterministic load-more gating, so fast scroll cannot miss or spam requests.
15. As a developer, I want no RAF/timeout correction loops for core scroll behavior, so architecture stays clean.
16. As a maintainer, I want phased rollout with hard QA gates, so risk is controlled.

## 'Polishing' Requirements

1. No visible virtualization artifacts (blank, flash, jump-correction feel).
2. Sidebar and conversation interaction smoothness at least equal to current baseline.
3. Open/submit/stream/prepend feel deterministic on desktop and mobile.
4. Existing visual polish (header/footer overlays, sticky input, spacing rhythm) preserved.
5. Keyboard/focus/context-menu semantics unchanged.
6. Debug logs and temporary instrumentation removed before merge.

## Implementation Decisions

1. **Phased execution (hard gate)**
   - Phase A sidebar shipped and QA-signed before Phase B conversation starts.

2. **Dependency decision**
   - Add LegendList web package usage and retire current virtualization placeholder dependency for this surface.

3. **Sidebar virtualization module design**
   - Introduce a sidebar virtual list controller that owns:
     - LegendList props configuration,
     - key extraction policy,
     - bottom boundary load-more callback,
     - request dedupe/in-flight guard,
     - top-insert stability policy.
   - Keep existing sidebar composition shell unchanged (provider, overlays, mobile persisted behavior).

4. **Sidebar row rendering policy**
   - Keep existing thread row component and interaction logic.
   - Remove pseudo-virtual row mechanics from row path (`content-visibility` event gating and React `Activity` row hiding).
   - Keep non-conflicting lightweight CSS containment where beneficial.

5. **Sidebar boundary trigger policy**
   - Use LegendList end-threshold callback as primary trigger.
   - Add app-level gating to enforce: one in-flight load per boundary cycle, no duplicate bursts, no missed retry after settle.

6. **Conversation virtualization module design**
   - Introduce a conversation window-virtual controller that owns:
     - LegendList window-scroll config,
     - list imperative handle integration,
     - bottom-state signal derivation,
     - prepend/append/stream anchor policy,
     - top-boundary pagination trigger policy.
   - Keep conversation L3 adapter/layout split; virtualization lives in layout boundary.

7. **Conversation behavior policy (LegendList)**
   - Use window scroll mode with end alignment.
   - Use initial end positioning strategy from list config (not manual probe scroll).
   - Use maintain-at-end behavior for append/stream updates only when user is near end.
   - Use maintain-visible-content-position with data+size stability for prepend and size changes.

8. **Submit/open scroll policy**
   - Submit intent continues to trigger explicit programmatic scroll-to-end once intent message is committed.
   - Initial open uses list initial positioning; no RAF/timeout settle loops.
   - If initial convergence still shows one-frame instability, allow explicit short stabilization-hidden state with deterministic reveal condition (no timer fallback).

9. **Conversation pagination wiring decision**
   - Wire real top-boundary load-more to existing paginated messages source now (not mocked callback).
   - Extend active-thread message state contract to expose older-history pagination controls/status required by UI.

10. **Bottom-state source migration**
    - Replace probe-based bottom visibility as primary source for conversation controls with virtualizer-aware state derived from list handle/state.
    - Keep user-facing behavior equivalent.

11. **Data and key invariants**
    - Message/thread item keys remain stable UUIDs.
    - No index keys.
    - If any in-place array mutation is introduced later, explicit data-version invalidation is required.

12. **Risk management**
    - No broad refactor of chat data-layer shape in this PRD.
    - No redesign of message/sidebar UI structure.
    - Keep changes concentrated in list rendering + pagination control boundaries.

## Testing Decisions

1. **Test quality bar**
   - Validate external behavior, not implementation internals.
   - Focus on user-visible stability and pagination correctness.

2. **Automated checks in scope**
   - Run `pnpm run check-types` after each phase.

3. **Manual QA ownership**
   - User runs manual QA; implementation handoff must include explicit scenario checklist and pass criteria.

4. **Sidebar QA checklist**
   - Long history fast scroll down/up; confirm no blank/jump artifacts.
   - Repeated bottom reaches; confirm load-more always fires when needed.
   - Confirm duplicate call prevention while load in-flight.
   - Validate active row + context menu + desktop/mobile sidebar behaviors unchanged.

5. **Conversation QA checklist**
   - Open long thread; confirm deterministic initial anchor behavior.
   - Submit repeatedly; confirm each submit reaches end deterministically.
   - Scroll away from end during streaming; confirm no autonomous movement.
   - Reach top repeatedly; confirm older-history load-more reliability.
   - During prepend loads, confirm viewport pixel-stable (no visible jump).
   - Validate scroll-to-bottom control behavior parity.

6. **QA report format required from user**
   - scenario, expected, observed, pass/fail, notes (optionally video).

## Out of Scope

1. Full scroll restoration across route/app reload.
2. Virtualization rollout to other surfaces.
3. Full chat architecture/data pipeline rewrite.
4. Visual redesign of sidebar/message components.
5. New non-virtualization features.

## Further Notes

1. This PRD intentionally keeps scope tight to MVP-critical virtualization correctness.
2. LegendList defaults/behaviors must follow local reverse-engineered documentation already produced for this repo context.
3. If any rule here conflicts with MVP anchor policy decisions, anchor policy must be resolved first before coding conversation phase.

## Unresolved Questions

- Initial open anchor final rule: force end always, or restore alternate anchor (last-read / last-user) when available?
  - => for now, force end always.
- If alternate anchor is desired later, should this PRD still ship force-end now as MVP baseline?
  - => force-end.

## Resources

- You must always read this documentation first: @.llms/plan/virtualization/0-legendlist-documentation.md
- If adhoc need of specific deeper answers, you must then ask a sub-agent to browser source code at: @.llms/git-references/legendlist for legendlist source code and examples and git history (browse with sub-agent) (N.B. the react web part is not documented and is the only part we care about (the lib cas initially designed for react native))
- DO NOT use web or context7 for legendlist related question. The library is in beta and undocumented yet.
