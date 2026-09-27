# PRD - TanStack Virtual Rewrite for Chat Surfaces

## Status

- Owner: chat MVP track
- Priority: high
- Approach: strict rewrite (no fallback path)
- Library: `@tanstack/react-virtual`

## Problem Statement

Current virtualization direction (previous lib/path) failed core UX constraints:

1. Wrong scroll ownership (nested inner scrollers appeared).
2. Sidebar visual behavior regressed (content no longer flowing under overlays).
3. Conversation layout/anchor behavior regressed.
4. Scope drift introduced compatibility toggles and complexity not needed for MVP.

We need a clean, deterministic virtualization rewrite that preserves current UX contracts and improves performance.

## Solution

Adopt TanStack Virtual with strict surface ownership:

1. Sidebar uses **element virtualizer** (sidebar content scroll container).
2. Conversation uses **window virtualizer** (document/window scroll).
3. Keep existing probe-based scroll contract as primary behavior API (bottom/checkpoint semantics).
4. Remove fake virtualization and remove fallback/disable paths.

This provides window-scroll-native conversation virtualization while preserving existing UX behavior.

## Decision Log (Resolved)

1. Delivery order: **Sidebar first, then conversation**.
2. Scroll hosts: **Sidebar = element**, **Conversation = window**.
3. Conversation loading scope: **render virtualization only + `onLoadOlder` API slot** (no fetch wiring now).
4. Anchor semantics: **checkpoint model kept**, checkpoint currently at bottom.
5. Streaming behavior: **never continuous auto-follow while streaming**.
6. Sidebar pagination trigger: **range-end threshold**, trigger at **6 rows before end**.
7. Legacy behavior: **delete old paths immediately**.
8. Conversation measurement: **measure every rendered row** (`measureElement`).
9. Conversation estimate policy: **conservative-high estimate**.
10. `useFlushSync`: **default false**, allow per-surface override if proven necessary.
11. Scroll behavior: **`auto` only** (no smooth for dynamic measured rows).
12. Scroll action ownership: **probe hook remains primary**, virtualizer APIs exposed for future.
13. Perf gate: **INP p75 <= 200ms**.
14. Browser scope: **latest evergreen**.
15. Test scope this phase: **manual QA only**.
16. Sidebar sizing: **fixed-size rows**, no row measurement.
17. Future prepend anchor algorithm: **first-visible-key delta method**.
18. Rollback reference strategy: **git history + PRD notes**, no commented dead blocks.
19. Sidebar overscan: **8**.
20. Conversation overscan: **8**.

## User Stories

1. As a chat user, I want conversation scrolling to use page scroll, so behavior feels native.
2. As a chat user, I want no nested tiny scroll area in conversation, so reading is natural.
3. As a chat user, I want sidebar scrolling to stay smooth with many threads, so navigation stays fast.
4. As a chat user, I want sidebar content to pass under header/footer overlays, so backdrop effect remains intact.
5. As a chat user, I want initial open anchor behavior unchanged, so conversation opens predictably.
6. As a chat user, I want scroll-to-bottom action unchanged, so existing muscle memory still works.
7. As a chat user, I want submit-triggered scroll behavior unchanged, so send flow feels the same.
8. As a chat user, I never want forced streaming auto-follow when I scroll up, so I can read older messages.
9. As a chat user, I want long threads/messages to remain fluid, so app feels premium.
10. As a chat user, I want no visible layout shifts during normal interaction.
11. As a developer, I want one production path per surface, so debugging is simple.
12. As a developer, I want no virtualization toggles/fallback branches, so complexity stays low.
13. As a developer, I want stable key-based virtualization, so measurements stay deterministic.
14. As a developer, I want fixed-size sidebar virtualization, so implementation remains cheap and robust.
15. As a developer, I want conversation load-older API slot defined now, so future prepend is straightforward.
16. As a maintainer, I want explicit acceptance gates, so rollout decisions are objective.

## Polishing Requirements

1. No visual drift in spacing/typography/row composition.
2. Last-assistant reserve behavior remains unchanged.
3. Scroll button visibility/action remains unchanged.
4. Sidebar hover/context-menu interactions remain unchanged.
5. No blank flashes during normal wheel/touch scroll.
6. No unexpected autoscroll during streaming.
7. Mobile keyboard/sticky input behavior remains unchanged.

## Requirements

## Functional

1. Sidebar virtualization must use element-scroller virtualizer.
2. Conversation virtualization must use window-scroller virtualizer.
3. Conversation keeps chronological order (latest at bottom).
4. Conversation keeps checkpoint-based architecture (checkpoint currently bottom).
5. Conversation preserves existing initial scroll and submit-scroll behavior through current probe-based contract.
6. Conversation exposes `onLoadOlder` callback slot in virtualization adapter API, unimplemented.
7. Sidebar auto-load-more triggers when last virtual row index reaches `(count - 1 - 6)`.
8. Sidebar rows use fixed-size strategy by breakpoint (no dynamic measuring).
9. Conversation rows use dynamic measurement for all rendered rows.
10. No smooth scrolling APIs in virtualized conversation actions.

## Performance

1. INP p75 <= 200ms on key chat interactions.
2. Overscan starts at 8 (sidebar + conversation), then tune only if measured need.
3. `useFlushSync` defaults to false.
4. `useFlushSync` override allowed only if proven needed for stability on that surface.

## Reliability

1. Stable item keys required for both surfaces.
2. No index-based keying for mutable chat/thread data.
3. Conversation estimate must be conservative-high to reduce correction churn.
4. Browser scope: latest evergreen only for this phase.

## Architecture and Module Design

## Layer Placement

1. L3 feature adapters own TanStack virtualizer wiring for sidebar and conversation.
2. Existing presentational row components remain composed; avoid direct visual rewrites.
3. Shared app-agnostic helper utilities may be extracted only if reused by both surfaces.

## Deep Modules

1. **SidebarVirtualAdapter**
   - Inputs: thread list, active id, load-more callback.
   - Responsibilities: fixed-size virtual rows, range-end prefetch trigger, render mapping.
   - Output: unchanged sidebar item UI behavior.

2. **ConversationVirtualAdapter**
   - Inputs: ordered messages, pending/settled flags, probe refs, optional `onLoadOlder` slot.
   - Responsibilities: window virtualization, dynamic row measurement, anchor-safe rendering.
   - Output: unchanged conversation UX behavior.

3. **VirtualScrollBridge (conversation)**
   - Responsibility: expose virtualizer capabilities for future features without replacing probe contract now.
   - Scope now: internal utility only; no behavior ownership transfer.

## Scroll and Anchor Behavior

1. Probe-based scroll hook remains source of truth for:
   - initial anchor action,
   - submit-triggered scroll,
   - bottom/checkpoint visibility state.
2. Virtualizer `scrollToIndex/scrollToOffset` is enabled for future incremental migration.
3. Programmatic behavior set to `auto` only in dynamic-mode conversation.
4. Continuous streaming autoscroll remains disabled.

## Future Prepend Design (Specified Now, Implement Later)

When `onLoadOlder` gets wired in later phase:

1. Capture first visible virtual item key and pre-prepend start position.
2. Prepend older messages.
3. Recompute same key position after measurement settles.
4. Apply offset delta correction (`auto` behavior) to keep viewport stable.

This is required for no-jump upward history loading with variable row heights.

## Scope Guardrails

1. No env flags for virtualization enable/disable.
2. No dual render path old/new.
3. No commented rollback code blocks.
4. Rollback only through git history.

## Implementation Plan

1. Sidebar virtualizer integration (fixed-size, element scroller, range-end trigger).
2. Remove fake sidebar virtualization constructs.
3. Conversation virtualizer integration (window scroller, dynamic measure, probe parity).
4. Add conversation load-older callback slot (API only).
5. Tune estimates/overscan against measured behavior.
6. Validate acceptance criteria manually.

## Testing Decisions

1. This phase uses manual QA only.
2. For implementation PRs tied to this PRD, run `pnpm run check-types`.
3. Required manual matrix:
   - sidebar overlay backdrop behavior,
   - sidebar infinite load trigger timing,
   - conversation main-window scroll ownership,
   - initial anchor behavior,
   - submit scroll behavior,
   - no forced streaming follow,
   - long conversation scroll smoothness,
   - mobile keyboard + sticky input behavior.

## Acceptance Criteria (Hard)

1. Conversation has no effective inner scroll container; window/document scroll is authoritative.
2. Sidebar remains element-scroll-based and keeps overlay/backdrop behavior.
3. Fake sidebar virtualization code path removed.
4. No virtualization fallback/toggle path exists.
5. Conversation still uses current probe-based behavior contract.
6. Streaming does not force continuous auto-follow.
7. `onLoadOlder` API slot exists in conversation adapter, unwired.
8. INP p75 <= 200ms on target interactions.

## Risks

1. Dynamic measurement corrections can cause visible jump if estimates are too low.
2. Window virtualizer placement may drift without correct scroll margin handling.
3. Manual-only QA can miss edge regressions.
4. `useFlushSync=false` may require selective override on specific surfaces/devices.

## Mitigations

1. Start with conservative-high estimate and adjust with measured traces.
2. Validate window scroll origin and transform math in layout harness.
3. Keep rollout order sidebar-first to reduce concurrent blast radius.
4. If stability issue appears, enable per-surface `useFlushSync=true` behind code-level local config (not user/runtime toggle).

## Out of Scope

1. Wiring conversation older-history fetch flow.
2. Persisted true last-read checkpoint feature.
3. Optional user setting for streaming auto-follow.
4. Automated test suite expansion in this phase.
5. Visual redesign work.

## Further Notes

1. TanStack supports both element and window virtualization directly; this PRD relies on native adapters instead of custom scroller emulation.
2. Smooth-scrolling with dynamic measured rows is intentionally avoided per library guidance.
3. Any scope addition that introduces fallback modes is rejected unless a production incident mandates it.

## Unresolved Questions

- none
