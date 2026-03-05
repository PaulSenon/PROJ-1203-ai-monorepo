# PRD - Chat Message Referential Stability and Selection Preservation

## Problem Statement

When a conversation loads from cache first and then fresh persisted data arrives, message rendering currently flickers for a frame and active text selections are dropped.

From user perspective this is severe UX breakage:

- Selecting/copying text is unreliable during load transitions.
- Visual trust is reduced because message content appears to repaint even when semantic content should be unchanged.
- Reading flow breaks exactly at stale-to-fresh handoff.

Observed behavior indicates same logical messages are being replaced as new render objects, causing downstream markdown/render trees to re-render or rebuild.

Hard product requirement: stale-to-fresh transition must keep text selection intact and avoid visible flicker.

## Solution

Introduce deterministic structural sharing in message reconciliation so unchanged logical messages preserve object references across layer transitions.

Core strategy:

1. Build a stable message reconciler that reuses prior message objects by id when semantic payload is unchanged.
2. Keep message metadata ownership model intact (including debug dataSource in metadata), but allow deferred non-critical debug updates if needed to preserve render stability.
3. Stabilize markdown renderer inputs so unchanged content does not trigger avoidable rerenders.
4. Add acceptance instrumentation and QA protocol proving no selection loss during stale-to-fresh replacement.

Outcome expected by users:

- No visible one-frame repaint for unchanged messages.
- Existing text selection survives cache-to-persisted handoff.
- Message order/content correctness preserved.

## User Stories

1. As a chat user, I want selected text to stay selected while conversation data refreshes, so I can copy reliably.
2. As a chat user, I want no flash/repaint for unchanged messages during initial load, so reading feels stable.
3. As a chat user, I want stale-to-fresh transition to feel seamless, so chat appears native quality.
4. As a chat user, I want message order to remain correct while stabilization logic runs, so conversation meaning is preserved.
5. As a chat user, I want no additional delay before seeing persisted data, so responsiveness is not degraded.
6. As a chat user, I want streaming behavior to remain smooth after this change, so ongoing responses still feel real-time.
7. As a chat user, I want selection behavior to remain stable on desktop and mobile browsers, so copy workflows are consistent.
8. As a chat user, I want markdown formatting to remain unchanged, so presentation fidelity is preserved.
9. As a developer, I want reconciliation to be deterministic and explicit, so regressions are easy to reason about.
10. As a developer, I want unchanged messages to keep references, so memoization can work as intended.
11. As a developer, I want changed messages to still update correctly, so data correctness is never traded for stability.
12. As a developer, I want metadata handling to remain compatible with server-provided metadata, so contracts stay coherent.
13. As a developer, I want debug dataSource to stay available in message metadata, so diagnostics remain usable.
14. As a developer, I want optional delay of debug-only metadata changes, so UI stability can be prioritized safely.
15. As a maintainer, I want behavior-focused acceptance criteria for selection persistence, so releases can be validated objectively.
16. As a maintainer, I want implementation scoped to message/render stability only, so MVP work does not drift.
17. As a maintainer, I want clear non-goals documented, so follow-up work can be sequenced cleanly.
18. As a QA reviewer, I want deterministic repro steps for stale-to-fresh transition, so pass/fail is unambiguous.
19. As a QA reviewer, I want verification that unchanged messages do not remount/repaint, so root issue is truly fixed.
20. As a product owner, I want strict acceptance that selection never drops on stale-to-fresh, so UX quality bar is explicit.

## 'Polishing' Requirements

1. No visible flicker for unchanged messages during cache-to-persisted takeover.
2. Selection persistence verified repeatedly with long and short selections.
3. Debug metadata visibility preserved (even if minor delay is introduced).
4. Console/debug instrumentation removed or gated behind explicit debug flag before merge.
5. No regression in message ordering, optimistic shell behavior, or stream status affordances.
6. Loading experience remains smooth on both low-end and high-end devices.

## Implementation Decisions

1. **Reconciliation architecture**
   - Introduce a dedicated deep reconciliation module responsible for merging layered message sources using immutable structural sharing.
   - Module guarantees: unchanged logical message returns previous object reference; changed logical message returns new object.

2. **Semantic equality contract**
   - Define explicit equality boundary for “unchanged logical message” including id, role, parts content/shape, lifecycle fields, live status, error payload, and metadata fields that affect UI.
   - Exclude purely diagnostic fields from forcing immediate object replacement when safe.

3. **Metadata policy**
   - Keep debug `dataSource` in message metadata (not side-map) to remain consistent with possible server-origin metadata.
   - Permit delayed propagation of debug-only metadata updates when immediate propagation would break render stability and user-facing content is unchanged.

4. **Message merge ordering policy**
   - Preserve existing merge precedence across cache, persisted, optimistic, resumed-stream, and http-stream layers.
   - Stabilize ordering comparator behavior for ties and missing values so merges are deterministic and do not introduce incidental reordering.

5. **Renderer input stability policy**
   - Ensure markdown renderer receives stable prop identities whenever message content is unchanged.
   - Memoize/hoist non-content config objects and callbacks passed into markdown rendering path.

6. **No mutation rule**
   - Do not mutate existing message objects in place.
   - Use immutable updates with structural sharing to remain React-safe and predictable.

7. **Acceptance instrumentation policy**
   - Add temporary diagnostics for message identity retention, render counts, and stale-to-fresh transition boundaries.
   - Instrumentation must be removable or strictly gated.

8. **Performance guardrails**
   - Reconciliation work must avoid quadratic scans on hot paths.
   - Use keyed maps/indexes to preserve current performance profile for large conversations.

9. **Compatibility constraints**
   - Maintain current external hook API shape for conversation consumers.
   - Keep existing UX rules for optimistic assistant shell and stream status transitions.

10. **Rollback lever**
    - Ship behind a quick-disable runtime flag so behavior can revert to current merge path immediately if critical regressions appear during rollout.

## Testing Decisions

1. **Test quality bar**
   - Validate externally observable behavior (selection persistence, visual stability, data correctness), not private implementation details.

2. **Primary behavior checks**
   - Stale-to-fresh transition with selected text in visible message: selection must persist.
   - Repeated stale-to-fresh transitions: no intermittent flicker.
   - Changed-message path: updates still render correctly when content truly changes.

3. **Comparator/reconciliation behavior checks**
   - Unchanged message payload returns same reference.
   - Changed payload returns new reference.
   - Ordering remains deterministic under equal timestamps and partial metadata.

4. **Markdown stability checks**
   - Unchanged markdown input does not trigger avoidable full re-render behavior from parent updates.
   - Streaming mode transitions still behave correctly.

5. **Regression checks**
   - Optimistic patches still apply/revert correctly.
   - Stream resumed/http stream layering still takes precedence as designed.
   - Pagination load-more behavior unchanged.

6. **Command policy**
   - Automated verification command in this repo context: `pnpm run check-types`.

7. **Manual QA checklist required for signoff**
   - Select text before persisted handoff and verify selection survives after handoff.
   - Observe transition frame-by-frame (video acceptable) and confirm no flash of unchanged message blocks.
   - Repeat on at least one Chromium-based browser and one WebKit-based browser.

8. **Hard acceptance gate**
   - `0` selection drops across `20` consecutive stale-to-fresh transition runs on unchanged message content.

## Out of Scope

1. Full redesign of conversation UI or markdown renderer feature set.
2. Re-architecture of streaming transport or backend message schema.
3. Broad virtualization refactor unrelated to stale-to-fresh stability.
4. New user-visible debug UI beyond existing metadata behavior.
5. Additional non-critical performance projects not tied to this defect.

## Further Notes

1. Acceptance is strict: selection must not drop during stale-to-fresh handoff for unchanged message content.
2. If a tradeoff is required, prioritize user-visible stability over immediate debug metadata repaint.
3. This PRD intentionally limits scope to defect elimination and reliability hardening, not feature expansion.
4. Clarification: when semantic message content genuinely changes, rerender is allowed; guarantee targets unchanged-content takeover path.
