# PRD - Phase 1 Instant Thread Navigation Feedback

## Problem Statement

Thread switch feedback is too slow because navigation intent and heavy conversation rendering run in the same critical path.

Current behavior couples click -> route change -> expensive subtree reset/remount. This delays immediate user feedback and harms perceived responsiveness.

Expected behavior:

1. Click thread.
2. URL and sidebar selected state update immediately.
3. Conversation area immediately transitions to blank state.
4. New conversation appears when heavy render completes.

## Solution

Implement a two-layer navigation/render model:

- Immediate layer: owns routing and selected-thread intent, updates synchronously.
- Deferred layer: consumes selected thread through deferred value and renders heavy thread-scoped tree.

During deferred catch-up:

- Conversation panel is blank.
- Input stays visible, is reset, and fully disabled.
- Transition timing: instant blank-out (no fade-out), then subtle fade-in only when new content is ready.

When deferred render is ready:

- Conversation appears.
- Input re-enables with thread-correct state.

## User Stories

1. As a user, I want thread clicks to acknowledge instantly, so app feels fast.
2. As a user, I want sidebar active row to update immediately, so I trust my click landed.
3. As a user, I want URL to update immediately, so navigation state stays reliable.
4. As a user, I want conversation content to clear instantly during switch, so stale thread content never appears as current.
5. As a user, I want subtle transition polish, so switch feels intentional.
6. As a user, I want input to stay visible during switch, so layout feels stable.
7. As a user, I want input reset + disabled during switch, so I cannot submit against wrong thread.
8. As a user, I want latest-click-wins behavior during fast switching, so UI tracks my newest intent.
9. As a user, I want keyboard and pointer navigation parity, so behavior is consistent.
10. As a user, I want mobile and desktop parity, so switch behavior is predictable everywhere.
11. As a user, I want new-chat flow to follow same instant switch contract, so behavior is coherent.
12. As a maintainer, I want migration without hidden regressions in thread reset semantics, so existing hooks remain correct.
13. As a maintainer, I want explicit contracts for thread-scoped state ownership, so reset behavior is deterministic.
14. As a maintainer, I want phased migration with safety checkpoints, so architecture change stays low-risk.

## 'Polishing' Requirements

1. No stale content flash.
2. Fade is subtle (no heavy animation).
3. No layout jump when entering blank state.
4. Input visibility remains constant across switch.
5. Disabled-state affordance is clear and consistent.
6. No debug logs left in shipped flow.

## Implementation Decisions

1. **Immediate vs Deferred Boundaries**
   - Keep route/navigation state synchronous.
   - Introduce deferred selected-thread value for heavy render boundary.
   - Compute `isSwitching` from immediate vs deferred selected id.

2. **Transition Surface Contract**
   - On `isSwitching`, show blank conversation surface.
   - Disappear path: no fade, instant blank-out.
   - Appear path: subtle opacity fade-in only after deferred content is ready.
   - Keep composer visible at all times.

3. **Composer Contract During Switch**
   - On switch start, reset composer value.
   - Disable composer interactions fully until deferred thread is active.
   - No queued submit while disabled.

4. **Thread Reset Contract (Critical Risk Area)**
   - Replace implicit reset-by-remount assumptions with explicit thread-scoped contracts.
   - Every thread-sensitive provider/hook receives explicit thread identity input (id/isNew where required).
   - Reset semantics must be keyed by thread identity contract, not incidental remount side effects.

5. **Migration Strategy to Avoid Regression**
   - Do not do big-bang router redesign.
   - Keep existing route topology stable during phase 1.
   - Migrate in checkpoints:
     1) Introduce deferred boundary + blank transition shell.
     2) Move thread-sensitive state to explicit thread-scoped inputs.
     3) Remove forced rerender/remount trigger mechanisms only after parity checks pass.
   - At each checkpoint, verify parity on send/regenerate/draft/input/model flows.

6. **Compatibility Matrix Requirement**
   - Build a thread-reset dependency matrix before refactor:
     - Which modules currently rely on remount for reset.
     - Target explicit reset trigger per module.
     - Expected behavior before vs after.
   - Refactor accepted only when every module has mapped replacement reset trigger.

7. **Model Selection Contract**
   - Keep selector UI globally placed.
   - Keep selected model state per thread.
   - Resolve selected model against deferred-active thread boundary to prevent cross-thread leakage during switch.

8. **Readiness / App Status Contract**
   - Preserve startup readiness behavior.
   - Transition periods must not incorrectly regress global app-ready state after initial load.

9. **Rapid Navigation Concurrency Contract**
   - Latest intent wins.
   - Intermediate heavy renders can be interrupted/discarded safely.
   - No stale completion should overwrite latest selected thread view.

## Testing Decisions

1. **Quality bar**
   - Test external behavior only (what user sees/can do), not internals.
   - Focus on switch responsiveness and correctness under rapid interaction.

2. **Required automated check**
   - Run `pnpm run check-types`.

3. **Manual QA scenarios (must pass)**
   - Existing thread A -> B: URL/selection immediate, conversation blanks immediately (no fade-out), input visible+reset+disabled, B appears with subtle fade-in, then input enabled.
   - Rapid A -> B -> C clicks: only C ends visible, no stale overwrite.
   - New chat -> existing thread -> new chat: same transition contract each hop.
   - Keyboard selection in sidebar: same contract as pointer.
   - Mobile sidebar selection: same contract as desktop.
   - During switch, submit blocked in all paths.

4. **Regression matrix (must pass)**
   - Draft lifecycle remains correct per thread.
   - Send/regenerate actions target correct thread after rapid switches.
   - Model selection remains thread-correct.
   - Any auth/internal hook that depended on remount still behaves correctly via explicit thread contract.

## Out of Scope

1. Conversation render-performance optimization internals.
2. Data prefetch/prewarm strategies.
3. New product features unrelated to switch-feedback contract.

## Further Notes

1. Main risk is hidden reliance on remount side effects. This PRD explicitly replaces that with formal thread-scoped contracts.
2. If parity fails for any thread-sensitive module, stop and patch contract mapping before further migration.
