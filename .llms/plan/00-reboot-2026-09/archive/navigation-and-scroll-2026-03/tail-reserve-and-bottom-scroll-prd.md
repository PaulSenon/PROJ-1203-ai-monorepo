# PRD - Chat Referential Stability + Tail-Aware Virtualization + Bottom Scroll Reliability

## Problem Statement

Current work solved core stale-to-fresh flicker/selection risk, but introduced 2 regressions:

1. **Reserve-space stickiness bug**
   - `itemsAreEqual` uses strict ref equality only.
   - Last-row UI depends on `index` + list length.
   - When old last assistant moves out of last position but object ref is reused, row may not re-render and keeps reserve min-height incorrectly.

2. **Scroll-to-bottom reliability bug**
   - Scroll action currently aligns bottom probe to top viewport, not true container end.
   - With dynamic tail spacing + virtualization, button and submit auto-scroll can land short of bottom or feel broken.

These regressions conflict with MVP UX goals and acceptance around deterministic chat behavior.

## Goals

1. Keep stale-to-fresh referential stability and selection preservation.
2. Guarantee reserve-space only applies to current last assistant row.
3. Guarantee "scroll to bottom" reaches real bottom of active scroll container.
4. Keep implementation minimal and scoped (no data-layer redesign).

## Non-Goals

1. New anchor strategies (last-read, semantic anchor restore).
2. Full conversation virtualization redesign.
3. New debug UI features.
4. Broad interaction redesign.

## Decisions

1. **Tail-aware `itemsAreEqual` (required)**
   - Keep structural-sharing optimization for most rows.
   - Force re-render for tail-sensitive indices where UI depends on index/length.
   - Tail-sensitive window size: `2` rows (old-last + new-last).

   Comparator contract:

   ```ts
   const TAIL_SENSITIVE_COUNT = 2;

   function areMessagesEqual(prev, next, index, data) {
     if (prev !== next) return false;
     const tailStart = Math.max(0, data.length - TAIL_SENSITIVE_COUNT);
     if (index >= tailStart) return false; // force refresh tail rows
     return true;
   }
   ```

2. **Reserve latch policy unchanged**
   - Keep ref-backed one-way latch in thread session.
   - Reset only by thread remount key.
   - No new state machine.

3. **Bottom scroll semantic: true end**
   - `scrollToBottom` must scroll to container max offset (document/custom container), not probe-top alignment.
   - Keep `scrollToCheckpoint` unchanged.
   - Use `instant` on submit auto-scroll and bottom button for reliability first.

4. **Submit auto-scroll timing**
   - Keep existing "wait until last item rendered" pipeline.
   - Only change final action target/behavior (`scrollToBottom("instant")`).

## Implementation Plan

### 1) Fix tail stale-row rendering

File: `apps/web/src/components/chat/conversation/_parts/messages-list.tsx`

- Replace current 2-arg comparator with 4-arg tail-aware comparator.
- Keep `itemsAreEqual` enabled.
- Do not change keyExtractor or list identity model.
- Keep reserve class logic unchanged; rely on guaranteed tail re-render to recompute.

### 2) Fix bottom scroll behavior

File: `apps/web/src/components/ui-custom/chat/hooks/use-scroll-to-bottom.tsx`

- Reintroduce/implement `scrollContainerToEnd(container, behavior)`.
- Update provider `scrollToBottom` to call container-end function.
- Update standalone hook `scrollToBottom` similarly.
- Keep checkpoint flow using probe alignment API.

### 3) Apply instant behavior on user-facing triggers

Files:
- `apps/web/src/components/chat/chat.tsx`
- `apps/web/src/components/chat/conversation/conversation-layout.tsx`

- Scroll button click -> `scrollToBottom("instant")`.
- Submit auto-scroll callback -> `scrollToBottom("instant")`.

### 4) Keep referential-stability core unchanged

File: `apps/web/src/hooks/use-messages.tsx`

- No architecture change in reconcile pipeline.
- No change to semantic equality boundary in this slice.
- No change to rollback flag.

## Testing Plan

### Automated

- Run: `pnpm run check-types -F web`

### Manual QA matrix

1. **Tail reserve correctness**
   - Send message while prior assistant exists.
   - Verify only current last assistant has reserve min-height.
   - Verify prior assistant drops reserve immediately when no longer last.

2. **Button scroll**
   - Scroll mid-thread, click bottom button.
   - Must end at true window bottom every time.

3. **Submit scroll**
   - Submit from mid-thread and near-bottom.
   - Must end at true window bottom on each submit.

4. **Stale-to-fresh stability**
   - Select text before persisted handoff.
   - Run 20 transitions.
   - Acceptance: 0 selection drops, 0 unchanged-message flickers.

5. **Cross-browser**
   - Chromium + WebKit pass for above cases.

## Acceptance Criteria

1. Tail reserve bug fixed: no stale reserve on non-last messages.
2. Scroll button always reaches true bottom.
3. Submit auto-scroll always reaches true bottom.
4. Existing stale-to-fresh selection/flicker guarantees preserved.
5. No regression in load-more, stream render, or ordering behavior.

## Risks + Mitigations

1. **Risk:** Tail forced re-render increases work slightly.
   - **Mitigation:** Limit to last 2 rows only.

2. **Risk:** Instant scroll may feel abrupt.
   - **Mitigation:** Ship instant first for correctness; revisit smooth once stable.

3. **Risk:** Different container modes behave differently.
   - **Mitigation:** Explicit branch logic for document vs custom container.

## Rollback

- Fast rollback: remove tail-aware forcing and/or disable referential-stability via existing localStorage flag if critical issue appears.
- Scroll rollback: switch triggers back to previous behavior while keeping submit pipeline intact.
