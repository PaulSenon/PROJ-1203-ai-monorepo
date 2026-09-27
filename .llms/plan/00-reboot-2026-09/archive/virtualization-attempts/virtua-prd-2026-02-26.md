# PRD - Virtua Virtualization (Sidebar First, Conversation Second)

## Problem Statement

Current chat UX/perf target (high INP quality, no visible virtualization artifacts) is at risk with growing list sizes.

- Sidebar currently uses CSS/content-visibility based pseudo-virtualization and React Activity gating, not true range virtualization.
- Conversation renders full message list in window scroll context; data is paginated but UI does not yet implement robust top-boundary infinite loading behavior.
- MVP requires strict scroll stability: initial open at bottom, submit auto-scroll to bottom, no jitter while prepending/appending/streaming.

User expectation is strict: virtualization must be invisible to end users.

## Solution

Adopt `virtua` in two controlled phases with no scope creep.

1. **Phase A (Sidebar)**: replace pseudo-virtualization with `Virtualizer` based true virtualization inside existing sidebar UX/perf architecture.
2. **Phase B (Conversation)**: add `WindowVirtualizer` with top-direction infinite scroll (older messages), strict anchor stability, and deterministic bottom behavior.

Core doctrine:

- Preserve existing meaningful optimizations (deferred values, always-mounted mobile/sidebar behavior, layout containment where useful).
- Remove fake virtualization mechanisms that duplicate/conflict with range virtualization.
- Conversation scroll model is normal-flow only (non-inverted). Reverse/inverted scroll layout is forbidden as primary architecture.
- No timeout/RAF retry hacks for scroll correctness. If initial convergence is async by nature, allow one explicit temporary hidden/stabilizing state with deterministic reveal only.

## User Stories

1. As a user, I want the sidebar to stay smooth with large thread history, so navigation feels instant.
2. As a user, I want thread list scrolling to never show blank jumps, so the UI feels native.
3. As a user, I want sidebar load-more to trigger reliably even during fast flick scrolls, so I never get stuck at pagination boundaries.
4. As a user, I want the active thread item behavior to stay correct after virtualization, so state and selection remain trustworthy.
5. As a user, I want mobile sidebar behavior unchanged, so drawer/sheet interactions keep current quality.
6. As a user, I want desktop sidebar collapse/expand performance to stay excellent, so virtualization does not regress INP.
7. As a user, I want conversation open to land at bottom deterministically, so I can continue chat immediately.
8. As a user, I want submitting a message to keep me at the bottom, so I can follow assistant response without manual scrolling.
9. As a user, I want no visible scroll jumps while assistant content streams and grows, so reading remains stable.
10. As a user, I want my viewport to stay stable while older messages load above, so reading context is preserved.
11. As a user, I want no sticky-scroll forcing when I intentionally scroll away from bottom, so control stays with me.
12. As a user, I want conversation infinite loading for older history (top boundary) to be reliable, so no missing history or stuck state.
13. As a user, I want loading states to feel smooth and minimal, so virtualization does not look artificial.
14. As a user, I want message interaction affordances (context actions, copy, hover actions) to behave the same after virtualization.
15. As a user, I want no regression in keyboard navigation and accessibility semantics.
16. As a user, I want iOS/Android behavior to stay stable during momentum scrolling.
17. As a developer, I want clear anchor rules for prepend vs append changes, so behavior is deterministic.
18. As a developer, I want pagination triggers decoupled from fragile visual sentinels where needed, so fast scroll cannot skip load boundaries.
19. As a developer, I want explicit module boundaries (sidebar virtual module, conversation virtual module, pagination controller), so complexity stays manageable.
20. As a maintainer, I want phased rollout with reversible checkpoints, so risk is controlled.
21. As a maintainer, I want manual QA scripts that validate non-jitter guarantees, so regressions are caught before merge.

## 'Polishing' Requirements

1. No obvious virtualization artifacts (flash, blank holes, jump-correction feel).
2. INP quality on core interactions remains at least as good as current baseline.
3. Initial open + submit scroll behavior feel deterministic on desktop and mobile.
4. Streaming growth and prepend history preserve perceived visual anchor.
5. Existing sidebar visual/timing polish (header/footer overlays, deferred updates, always-mounted behavior) remains intact.
6. No accessibility regressions (focus, semantics, keyboard shortcuts, context menu activation).
7. Logs/debug leftovers removed after validation.

## Implementation Decisions

1. **Phased execution**
   - Implement sidebar virtualization first and freeze scope until QA pass.
   - Only then implement conversation window virtualization.

2. **Sidebar virtualization architecture**
   - Use Virtua `Virtualizer` as source of truth for mounted range.
   - Keep current sidebar scroll container; integrate `Virtualizer` into that container rather than replacing container architecture.
   - Keep existing sidebar outer architecture (sticky overlays, scroll edge behaviors, mobile persisted mount behavior, deferred list input data).
   - Remove pseudo-virtualization mechanisms (`content-visibility` event gating / Activity-based hidden subtree toggling) from row rendering path.
   - Keep lightweight CSS containment optimizations that do not conflict with Virtua range logic.

3. **Sidebar pagination trigger reliability**
   - Use deterministic load-more trigger with explicit status gating (`CanLoadMore`-style state checks and in-flight guard).
   - Design trigger to be impossible to miss during fast scroll (index/offset threshold based, not fragile single-frame checks).
   - Policy: single in-flight request per boundary detection, never duplicate while pending, never miss required call.

4. **Sidebar item identity and sizing**
   - Use stable message/thread IDs for keys; never index keys.
   - Preserve known row-height assumptions where valid; only add item size hints if empirically reducing jump.
   - Keep per-item interactivity and context-menu behavior unchanged.

5. **Conversation virtualization architecture**
   - Use `WindowVirtualizer` (window scroll native) for conversation list.
   - Keep current conversation L3 split (adapter/layout) and integrate virtualization inside layout boundary.
   - Preserve existing business UX rules (last-assistant reserve latch, optimistic assistant shell behavior).

6. **Conversation anchor model**
   - Canonical rule: pixel-stable viewport at all times unless user action explicitly changes position.
   - Define explicit anchor rules for each mutation type:
     - prepend older history,
     - append user/assistant messages,
     - in-place height growth while streaming.
   - Use Virtua `shift` only when data mutation is prepend-at-start; keep `shift=false` for append/mid updates.
   - No generic sticky-bottom mode, no auto-follow while user is away from bottom.

7. **Conversation scrolling architecture hard rule**
   - Use `WindowVirtualizer` with normal DOM/message order and explicit programmatic bottom alignment.
   - Do not use reverse/inverted scrolling architecture (`column-reverse` / reverse-flow chat model) as foundation.
   - Reason: iOS Safari reverse infinite behavior has known platform limitations and upstream fix is not planned.

8. **Initial open and submit-to-bottom behavior**
   - Always force exact bottom on conversation open.
   - Always force exact bottom on submit.
   - Keep deterministic programmatic bottom alignment using virtualizer handle methods.
   - No timeout/RAF retry loops.
   - If first-paint exactness cannot be guaranteed due async measurement, allow short explicit stabilization state that hides list until alignment is applied once.
   - Reveal from hidden state only on deterministic readiness condition; no timeout fallback.

9. **Conversation pagination (top boundary only in this scope)**
   - Implement reliable load-more strategy for top boundary (older messages) with gating and duplicate prevention.
   - In this scope, top boundary callback is wired to mocked debug logging only, to validate callback reliability without backend wiring changes.
   - On iOS Safari, prepend commits must be applied in an idle-safe timing path (not while active touch momentum is mutating scroll) to preserve visual stability.
   - Integrate with existing paginated data source semantics and keep message order contract unchanged.

10. **Scroll restoration future-proofing**

- Do not implement restoration now.
- Structure modules so Virtua cache snapshot + offset restoration can be added later without redesign.

11. **Module boundaries (deep modules)**

- `SidebarVirtualListController`: virtualization + range + load trigger + key policy.
- `SidebarLoadMorePolicy`: status gating and threshold/in-flight logic.
- `ConversationWindowVirtualController`: virtualizer handle orchestration and anchor rules.
- `ConversationPaginationPolicy`: top/bottom boundary detection + reliable load triggers.
- `ConversationBottomAlignmentPolicy`: initial open + submit alignment semantics.

12. **Rollout gates**

- Gate A: sidebar QA sign-off.
- Gate B: conversation QA sign-off.
- Each gate requires manual QA checklist completion and explicit user validation report.

13. **Platform quality requirement**

- iOS Safari momentum/reverse edge behavior is hard pass criterion, not best-effort.

14. **Bottom-state signal source**

- Replace probe-only bottom-state dependency for conversation controls with virtualizer-aware bottom logic in this migration.
- Keep resulting behavior equivalent for user-facing controls.

## Testing Decisions

1. **Test quality bar**
   - Verify external behavior and user-visible stability only.
   - Avoid coupling tests/QA checks to implementation internals.

2. **Validation mode in this scope**
   - Manual QA by user is primary acceptance mechanism.
   - `pnpm run check-types` after each implementation phase.

3. **Sidebar QA decisions**
   - Validate very long thread history scroll smoothness.
   - Validate rapid bottom flick + load-more reliability.
   - Validate desktop collapse/expand and mobile open/close unchanged.
   - Validate active thread highlighting and context-menu interactions across virtualized rows.

4. **Conversation QA decisions**
   - Validate initial open at bottom for short/long conversations.
   - Validate submit auto-scroll behavior for repeated sends.
   - Validate prepend older messages while user reading near top/middle.
   - Validate streaming growth while user at bottom and while user away from bottom.
   - Validate no jitter under top-boundary pagination and fast wheel/touch scroll.
   - Validate iOS Safari prepend behavior under active touch/momentum and confirm no visible instability (using idle-safe prepend application rule).

5. **Manual QA script required at implementation handoff**
   - Sidebar pass:
     1. Open very long thread history.
     2. Fast-scroll to bottom multiple times.
     3. Confirm load-more always triggers at least once when boundary reached.
     4. Confirm no duplicate load burst while one request pending.
     5. Confirm no visible shift while new thread insertions happen above current viewport.
     6. Confirm mobile sheet + desktop collapse/expand interactions unchanged.
   - Conversation pass:
     1. Open existing long conversation and confirm immediate exact-bottom state.
     2. Submit message repeatedly and confirm exact-bottom after each submit.
     3. Scroll up, trigger top prepend loads, confirm pixel-stable viewport.
     4. Scroll away from bottom during streaming and confirm zero autonomous movement.
     5. Trigger top-boundary callback path repeatedly and confirm invocation policy works (single in-flight, non-missed).
     6. Repeat on iOS Safari / touch momentum scroll and confirm same stability bar.
   - QA report format (user-provided): scenario, expected, observed, pass/fail, notes/video.

6. **Regression checks**
   - Validate no UX regression in deferred sidebar updates.
   - Validate no regression in existing reserve-space behavior for last assistant message.
   - Validate no regression in keyboard/focus behavior.

## Out of Scope

1. Full scroll restoration implementation.
2. List virtualization in surfaces other than sidebar + conversation.
3. Redesign of sidebar/conversation visual language.
4. Data-layer refactors unrelated to virtualization integration.
5. New feature additions not required for virtualization correctness/perf.

## Further Notes

1. **Warning (high-risk area):** conversation virtualization + streaming + prepend pagination is a fragile combination; strict phased rollout is mandatory.
2. Virtua docs/source confirm `shift` is prepend-specific; misuse on append/mid mutations can produce unstable behavior.
3. Virtua source also explicitly handles browser scroll anchoring conflicts (`overflow-anchor: none`) and iOS momentum edge cases; integration must not reintroduce conflicting browser anchoring hacks.
4. Upstream reverse-scroll iOS limitation is known and not planned for library-level fix; this PRD intentionally avoids reverse/inverted architecture as a primary design.
5. Keep architecture minimal: prefer simple deterministic policies over heuristic-heavy autoscroll logic.

## Unresolved Questions

none

## Resources

- @.llms/git-references/virtua for virtua source code (browse with sub-agent)
