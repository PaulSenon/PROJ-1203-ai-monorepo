# PRD - Phase 1: Instant Chat Navigation Feedback With Deferred Conversation Rendering

## Problem Statement

When a user clicks a thread in the chat sidebar, the app does not acknowledge navigation instantly. The target URL, selected sidebar state, and conversation-area feedback are coupled to the render cost of the destination conversation. As thread complexity grows, the click interaction feels delayed even if data is already available.

This is a core INP problem. The app must make navigation feel instant even when destination conversation rendering is expensive and treated as a black box.

The required UX for thread-link clicks is:

1. The URL changes immediately.
2. The clicked sidebar item becomes selected immediately.
3. The previously selected sidebar item becomes unselected immediately.
4. The conversation area blacks out immediately.
5. The input becomes disabled immediately.
6. Heavy conversation rendering is allowed to catch up later, without blocking the feedback above.

The current architecture relies heavily on current-thread-derived state and keyed resets. That creates too much synchronous work on navigation and makes shell reactivity depend on conversation complexity.

## Solution

Introduce a two-lane navigation model for chat thread switches:

1. **Urgent lane**
   - Owns immediate UI feedback.
   - Updates the target thread identity instantly on click.
   - Updates URL instantly.
   - Updates sidebar selected state instantly.
   - Shows blackout instantly.
   - Disables input instantly.

2. **Deferred lane**
   - Owns heavy conversation rendering.
   - Lags behind the urgent target thread identity.
   - Renders the destination conversation after urgent shell feedback has already committed.

Phase 1 intentionally does **not** redesign the whole chat architecture. It introduces the smallest viable decoupling layer that makes navigation feedback instant while preserving the current routing model and most current provider boundaries.

The baseline switching signal for this phase is derived, not separately stored:

- `isSwitching = instantThreadId !== deferredThreadId`

The heavy conversation path must consume the deferred thread identity only. The shell and sidebar must consume the instant thread identity only.

The previous conversation stays mounted underneath a blackout overlay while the deferred conversation catches up. We do not change scroll position, do not reset scroll, and do not change overflow behavior in a way that would cause unnecessary virtualizer recomputation or costly re-layout of the previous conversation.

The new-chat route is expected to remain effectively instant because it is cheap. Phase 1 should not add special complexity for it unless actual UX regression appears.

## User Stories

1. As a chat user, I want a thread click to acknowledge immediately, so that navigation feels responsive.
2. As a chat user, I want the URL to update immediately on thread click, so that browser history and deep-linking stay truthful.
3. As a chat user, I want the clicked sidebar thread to highlight immediately, so that I know my click was received.
4. As a chat user, I want the previous sidebar highlight to clear immediately, so that selection state is never ambiguous.
5. As a chat user, I want the conversation pane to black out immediately after thread click, so that I do not mistake stale content for the new thread.
6. As a chat user, I want the input to disable immediately during a thread switch, so that I cannot type into the wrong conversation context.
7. As a chat user, I want the previous conversation scroll position to remain untouched while switching, so that the app does not do unnecessary work or visual jumping.
8. As a chat user, I want the previous conversation not to visibly reflow during the blackout phase, so that the transition feels stable.
9. As a chat user, I want the destination conversation to appear only when ready to render, so that the app feels deliberate instead of glitchy.
10. As a chat user, I want repeated fast thread clicks to remain responsive, so that I can change my mind without waiting for a prior heavy render to finish.
11. As a chat user, I want the app to always reflect the latest clicked thread, so that abandoned intermediate renders do not confuse navigation state.
12. As a chat user, I want mobile and desktop sidebar behavior to remain consistent after this change, so that navigation quality improves everywhere.
13. As a chat user, I want keyboard and pointer interactions to keep the same semantics, so that performance work does not degrade usability.
14. As a chat user, I want the new-chat entry path to remain instant, so that starting a fresh conversation feels lightweight.
15. As a developer, I want shell feedback state separated from heavy conversation render state, so that navigation performance no longer depends on conversation complexity.
16. As a developer, I want a single derived switching rule, so that phase 1 stays small and understandable.
17. As a developer, I want the heavy conversation path to subscribe only to deferred thread identity, so that urgent shell updates stay cheap.
18. As a developer, I want the sidebar path to subscribe only to instant thread identity, so that active-row feedback never waits on conversation work.
19. As a maintainer, I want this phase to avoid a broad routing rewrite, so that risk stays controlled.
20. As a maintainer, I want this phase to be reversible and easy to reason about, so that later architecture cleanup can build on it safely.

## 'Polishing' Requirements

1. A thread click must feel instant on desktop and mobile even when destination conversation render is heavy.
2. No visible blank flash between click and destination reveal.
3. No visible scroll jump in the previous conversation during switching.
4. No overflow-mode flicker, scrollbar jump, or layout shift caused by blackout logic.
5. Sidebar active-state visuals must remain stable during rapid repeated clicks.
6. Input disabled styling must feel intentional, not broken or stuck.
7. Overlay and disabled states must be visually minimal and coherent with current design.
8. Temporary debug logs, instrumentation, and transition experiments must be removed before merge.

## Implementation Decisions

1. **Two identities**
   - Introduce an urgent thread identity for shell/sidebar/URL feedback.
   - Introduce a deferred thread identity for heavy conversation rendering.

2. **Derived switching policy**
   - Phase 1 uses a derived switching signal:
     - `isSwitching = instantThreadId !== deferredThreadId`
   - Do not introduce a second independent boolean unless phase 1 reveals a concrete gap.

3. **Deferral mechanism**
   - Use `useDeferredValue` as the primary mechanism in phase 1.
   - Do not start with a custom transition orchestration layer.
   - This keeps the implementation smaller and easier to validate.

4. **Navigation ownership**
   - The chat navigation coordinator becomes responsible for exposing:
     - instant thread identity,
     - deferred thread identity,
     - switching status,
     - navigation helpers.
   - Routing remains the canonical URL source.
   - Shell feedback is allowed to lead heavy content.

5. **Sidebar policy**
   - Sidebar selected state must be derived from the urgent thread identity.
   - Sidebar must not wait for deferred conversation render to reflect the user's click.

6. **Conversation policy**
   - Heavy conversation providers and renderers must read the deferred thread identity only.
   - The heavy path must not subscribe to urgent navigation state if that would re-couple shell feedback to render cost.

7. **Blackout policy**
   - Keep the previous conversation mounted under a blackout overlay while switching.
   - Do not unmount immediately on click.
   - Do not render both previous and next conversations as separate active panes at once.

8. **Scroll stability policy**
   - Do not change scroll position on switch.
   - Do not reset viewport.
   - Do not toggle scrolling behavior in ways that trigger unnecessary heavy recomputation of the previous conversation surface.
   - Prefer a top overlay layer that blocks interaction without changing content geometry.

9. **Reveal policy**
   - For phase 1, reveal is tied to deferred identity catch-up.
   - If visual testing shows a flash or premature reveal, phase 2 or a phase-1.1 follow-up may add a stronger layout-ready handshake.

10. **New chat policy**
    - New-chat flow should continue to feel instant.
    - Do not add a dedicated special-case implementation unless actual testing proves it necessary.

11. **Scope discipline**
    - Do not redesign draft, model, or message-session ownership in this phase.
    - Do not rewrite route topology in this phase.
    - Do not broadly remove all keyed resets in this phase.
    - Only decouple immediate navigation feedback from heavy conversation rendering.

## Testing Decisions

1. **Test quality bar**
   - Test externally visible navigation behavior.
   - Do not test hook internals or implementation-specific state wiring.
   - Good tests prove immediate feedback and stable reveal timing from the user's perspective.

2. **Primary modules to test**
   - Chat navigation coordinator behavior.
   - Sidebar selection behavior during switching.
   - Conversation shell blackout/disable behavior during switching.
   - Deferred conversation reveal behavior after switching.

3. **Behavioral scenarios to validate**
   - Click a heavy thread from another heavy thread; confirm immediate URL, highlight, blackout, and input disable.
   - Click multiple different threads rapidly; confirm latest click wins and sidebar feedback stays instant.
   - Switch from heavy thread to new chat; confirm new chat remains effectively instant.
   - Confirm previous conversation scroll position does not visibly move during switching.
   - Confirm no overflow flicker or layout shift caused by blackout overlay.
   - Confirm input re-enables when switching ends.
   - Confirm browser history remains correct after thread switches.

4. **Automated checks**
   - Run `pnpm run check-types`.

5. **Manual QA emphasis**
   - Manual QA is critical because this work targets interaction feel and render coupling.
   - QA should include desktop and mobile, slow machine simulation if available, and long-conversation threads.

6. **Prior art**
   - Prefer existing behavior-driven tests around chat navigation, sidebar selection, and shell state if present.
   - Reuse existing testing style in the repo rather than introducing a new testing pattern.

## Out of Scope

1. Full redesign of chat routing.
2. Full rewrite of thread/session/provider architecture.
3. Full removal of all thread-keyed resets across the app.
4. New data loading architecture.
5. Deferred loader or `<Await>` based designs.
6. Visual redesign of sidebar, conversation, or input.
7. Scroll restoration across browser reloads or back/forward restore.
8. General performance optimization unrelated to navigation feedback.
9. Virtualizer redesign or list-rendering redesign outside what is necessary to preserve stability.

## Further Notes

1. This phase intentionally optimizes for low-risk impact: instant feedback first, broader architecture later.
2. The main success criterion is subjective feel backed by objective behavior: a click must acknowledge immediately even if destination conversation render is expensive.
3. If phase 1 succeeds, it creates a safe seam for later cleanup rather than forcing a risky all-at-once refactor.
4. If phase 1 reveals that deferred catch-up alone is not sufficient for elegant reveal timing, the next increment should add an explicit layout-ready handshake rather than expanding scope indiscriminately.
