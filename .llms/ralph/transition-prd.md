# PRD - Chat Conversation Reveal System After Instant Navigation Feedback

## Problem Statement

The app now has the first half of good thread navigation behavior: when a user clicks a thread in the sidebar, the URL updates immediately, the active sidebar item updates immediately, the input disables immediately, and the previous conversation blacks out immediately while heavy conversation work catches up.

That solves the urgent acknowledgement problem, but the reveal side is still underdesigned.

Today, the conversation area has no explicit, durable reveal contract. The blackout phase is tied too closely to navigation deferral, while actual visual readiness is determined later by data and layout work. This creates three problems:

1. The new conversation can appear too abruptly or at the wrong moment.
2. There is no explicit business logic for deciding whether to skip, speed up, or play the reveal transition.
3. The current readiness plumbing is too legacy and boolean-oriented to become the long-term UI reveal foundation.

The desired UX is:

1. On hard load of a conversation, the conversation should reveal with a normal fade once rendered.
2. On client-side sidebar navigation, blackout must remain instant.
3. On client-side sidebar navigation, the new conversation should reveal only when it is visually ready.
4. On client-side sidebar navigation, reveal timing must depend on how long the user already waited behind blackout:
   - if ready in under 100ms, skip the fade and show instantly,
   - if ready between 100ms and 200ms, use a snappier/faster reveal,
   - if ready after 200ms, use the normal reveal.
5. The system must support elegant custom readiness signals from any source, not just one hardcoded boolean.
6. The system should be designed so it can become the future core UI reveal system, replacing the spirit of the old global load-status actions without inheriting that implementation shape.

This is not only an animation task. It is a state-ownership and readiness-contract task.

## Solution

Introduce a small, isolated **UI Reveal System** with a first concrete scope for chat conversation reveal.

The core design is:

1. **Persistent reveal coordinator**
   - Owns reveal sessions for a surface.
   - Survives thread navigation and deferred subtree remounts.
   - Separates urgent cover behavior from deferred visual reveal.

2. **Ready-signal contract**
   - Any relevant source can declare readiness for the current reveal session.
   - Sources do not own animation policy.
   - Sources only report whether their part of the UI is ready.
   - The coordinator decides when the surface may reveal.

3. **Overlay-first reveal model**
   - The system keeps an overlay covering the conversation surface.
   - On client navigation, the overlay becomes opaque instantly.
   - The destination conversation renders underneath the overlay.
   - Once the reveal session is ready, the overlay either disappears instantly, fades quickly, or fades normally.
   - We fade the overlay out rather than fading the heavy conversation tree in.

4. **Policy-driven reveal timing**
   - Reveal policy is chosen from a small resolver using:
     - reveal cause,
     - elapsed wait time since cover began,
     - accessibility preferences.
   - Initial load always uses the normal reveal.
   - Client navigation uses the 100ms / 200ms thresholds.

5. **Future-safe architecture**
   - The first consumer is chat conversation reveal.
   - The system is generic enough to support future UI surfaces.
   - Existing legacy app-load booleans may temporarily bridge into the new system, but the new system becomes the authoritative reveal model for surfaces that adopt it.

For chat, the first reveal scope should use an intentionally small set of readiness sources:

1. a conversation data-ready source,
2. a conversation layout-ready source,
3. an empty-surface fallback path when no message list layout event exists.

This keeps the implementation elegant and testable while still allowing future sources to join the contract later.

## User Stories

1. As a chat user, I want thread navigation to keep its instant blackout feedback, so that the app still acknowledges my click immediately.
2. As a chat user, I want a hard-loaded conversation to reveal deliberately instead of popping in abruptly, so that initial load feels polished.
3. As a chat user, I want a client-side navigated conversation to reveal only once it is actually ready, so that I never see half-ready content.
4. As a chat user, I want very fast client-side navigations to skip the reveal animation, so that the app feels instant rather than artificially slowed down.
5. As a chat user, I want medium-speed client-side navigations to use a snappier reveal, so that the transition matches the short wait.
6. As a chat user, I want slower client-side navigations to use the normal reveal, so that the result feels intentional after a noticeable wait.
7. As a chat user, I want the previous conversation to disappear immediately on thread switch, so that I do not mistake stale content for new content.
8. As a chat user, I want the reveal transition to avoid layout jumps or scrollbar flicker, so that the chat surface feels stable.
9. As a chat user, I want repeated rapid thread switches to always resolve to the latest clicked thread, so that stale reveals never win.
10. As a chat user, I want the reveal behavior to feel consistent across desktop and mobile, so that navigation quality is coherent everywhere.
11. As a chat user, I want reduced-motion preferences to be respected, so that the reveal never becomes uncomfortable.
12. As a chat user, I want empty conversations and populated conversations to reveal correctly, so that all thread types feel complete.
13. As a chat user, I want no flash of unstyled or half-laid-out conversation content, so that the app feels high quality.
14. As a chat user, I want the input disabled state and conversation reveal state to remain in sync, so that the UI never feels contradictory.
15. As a developer, I want a single reveal coordinator to own reveal decisions, so that animation policy is not spread across components.
16. As a developer, I want readiness to be reported through explicit source signals, so that reveal timing does not depend on accidental mount timing.
17. As a developer, I want any source to be able to participate in readiness, so that future surfaces can reuse the same contract.
18. As a developer, I want sources to report readiness without knowing reveal policy, so that business logic stays centralized.
19. As a developer, I want reveal state to survive deferred provider remounts, so that navigation transitions remain coherent.
20. As a developer, I want chat conversation reveal to remain isolated from heavy conversation rendering internals, so that performance work does not get re-coupled.
21. As a developer, I want a simple state machine for cover, wait, reveal, and settle, so that the system is understandable and testable.
22. As a developer, I want stale ready signals from abandoned navigations to be ignored, so that rapid interaction remains correct.
23. As a developer, I want initial load and client navigation to share the same primitive while still using different policy rules, so that the architecture stays unified.
24. As a maintainer, I want this system to become the new foundation for UI reveal orchestration, so that the old global load-status pattern can stop growing.
25. As a maintainer, I want this PRD to avoid a broad app-wide rewrite, so that we can adopt the system incrementally.
26. As a maintainer, I want the first implementation to prove the contract on chat before migrating other surfaces, so that risk stays controlled.
27. As a maintainer, I want the system to be deep and composable, so that future features consume a stable interface instead of inventing new local loading hacks.
28. As a maintainer, I want the reveal system to improve polish without regressing INP, so that UX quality and performance both move forward.

## 'Polishing' Requirements

1. Blackout on client navigation must remain visually instant.
2. Reveal must feel deliberate, not decorative.
3. No visible layout shift, scrollbar jump, or viewport jump may be introduced by reveal logic.
4. Overlay behavior must look stable even during rapid repeated thread clicks.
5. Fast-path skip and speed-up behavior must feel natural rather than arbitrary.
6. Reduced-motion users must receive a clean instant reveal path.
7. Empty-state and populated-state reveals must feel equally intentional.
8. Temporary debug logs, timing probes, and experimentation artifacts must be removed before merge.
9. Naming of the coordinator, sessions, scopes, and ready sources must be simple and reusable.

## Implementation Decisions

1. **Core abstraction**
   - Build a reusable UI reveal coordinator rather than another ad hoc chat-local boolean.
   - The coordinator owns reveal sessions, reveal policy resolution, stale-session invalidation, and surface-facing state.

2. **Scope model**
   - The first concrete scope is the chat conversation surface.
   - The coordinator design must remain generic enough to support additional surfaces later.
   - Adoption outside chat is explicitly deferred, but the API must not be chat-specific.

3. **Session model**
   - Each revealable surface runs one active reveal session at a time.
   - A session has at minimum:
     - scope identity,
     - target entity identity,
     - cause,
     - start timestamp,
     - current cover state,
     - pending ready sources,
     - resolved reveal preset.
   - Starting a new session invalidates stale signals from prior sessions.

4. **Cause model**
   - Initial implementation supports at least:
     - `initial-load`,
     - `client-navigation`.
   - The cause participates in policy resolution.

5. **Ready-source contract**
   - Ready sources identify themselves with stable source ids.
   - A source may participate in a session and later mark itself ready.
   - The reveal coordinator must not require every consumer to manually track timers or animation modes.
   - Sources only report readiness; they do not decide whether reveal should skip, speed up, or animate normally.

6. **Source composition policy**
   - The core system must support multiple sources.
   - The first chat adoption should remain intentionally small and use a shallow source set:
     - conversation data ready,
     - conversation layout ready,
     - empty-state fallback ready.
   - Lower-level details may be locally aggregated before reporting to the coordinator if that reduces noise.

7. **Legacy bridge policy**
   - Existing global load-status actions may temporarily read from or bridge into the new system where useful.
   - The new reveal system must not be modeled as a copy of the legacy global boolean store.
   - Legacy booleans remain compatibility helpers, not the source of truth for reveal orchestration.

8. **Surface rendering policy**
   - Keep one persistent overlay above the conversation surface.
   - On client navigation, cover becomes opaque immediately.
   - The new conversation renders under cover.
   - On ready, the overlay is either removed instantly or faded out according to the resolved preset.
   - Do not animate the heavy conversation tree itself as the primary reveal mechanism.

9. **Performance policy**
   - Reveal must be implemented with compositor-friendly properties only.
   - No reveal logic may depend on forced layout measurement loops, timeout-based scroll fixes, or geometry-mutating transitions.
   - The system must preserve the no-relayout property of the current blackout strategy.

10. **Policy resolver**
    - Introduce a small reveal-policy resolver function.
    - Resolver input includes:
      - cause,
      - elapsed wait time,
      - reduced-motion preference.
    - Resolver output includes at minimum:
      - reveal preset (`none`, `fast`, `normal`),
      - duration,
      - easing token.

11. **Initial load rule**
    - Initial load always uses the normal reveal preset unless reduced motion disables it.
    - Initial load must not reuse the client-navigation threshold rules.

12. **Client-navigation rule**
    - Client navigation uses wait-time-based reveal selection:
      - under 100ms => no reveal animation,
      - 100ms to under 200ms => fast reveal,
      - 200ms and above => normal reveal.
    - Thresholds are business rules, not magic values hidden inside components.

13. **Accessibility rule**
    - Reduced-motion preference forces the instant/no-animation reveal path.
    - Accessibility policy lives in the resolver, not in each consumer.

14. **Chat adoption boundary**
    - Chat navigation ownership remains responsible for starting reveal sessions on navigation.
    - Conversation-level logic remains responsible for reporting when the destination surface is visually ready.
    - The overlay surface consumes only derived reveal state.

15. **Visual-ready rule for chat**
    - A conversation is revealable only after data is ready and the relevant surface has had a valid first layout opportunity.
    - Populated conversations should use real list/layout readiness.
    - Empty conversations must use an explicit fallback readiness path so they are not blocked forever waiting for a list event that never occurs.

16. **Stale-session protection**
    - If a user triggers another navigation before the current session reveals, the earlier session becomes stale.
    - Stale ready signals and stale transition-end callbacks must be ignored.

17. **Provider lifetime decision**
    - The reveal coordinator must live above deferred thread-bound remount boundaries.
    - It must survive the full lifetime of chat route navigation.

18. **Scope discipline**
    - This work adds a reusable reveal system and first chat adoption.
    - It does not redesign all app loading, all route loading, or the full provider architecture.
    - It does not attempt a broad migration of every legacy loading boolean in the same change.

## Testing Decisions

1. **Test quality bar**
   - Test external behavior and state contracts, not component internals.
   - Good tests prove that cover, readiness, reveal preset selection, and stale-session handling behave correctly from the user’s perspective.

2. **Primary modules to test**
   - UI reveal coordinator.
   - Reveal policy resolver.
   - Chat reveal-session initiation behavior.
   - Chat conversation visual-ready bridge behavior.
   - Overlay surface behavior.

3. **Behavioral scenarios to validate**
   - Hard load of a conversation reveals with the normal preset.
   - Client navigation with readiness under 100ms reveals instantly.
   - Client navigation with readiness between 100ms and 200ms uses the fast reveal.
   - Client navigation with readiness above 200ms uses the normal reveal.
   - Reduced-motion preference disables reveal animation.
   - Rapid repeated thread clicks cause only the latest session to reveal.
   - Empty conversations reveal correctly without waiting on nonexistent list layout events.
   - Populated conversations do not reveal before first valid layout readiness.
   - Client-navigation blackout remains instant.
   - No layout jump or scroll jump is introduced by the reveal layer.

4. **Good automated test shape**
   - Prefer state-machine and contract tests for the coordinator/resolver.
   - Prefer behavioral tests for chat integration points.
   - Do not lock tests to specific provider nesting or incidental implementation details.

5. **Manual QA emphasis**
   - Manual QA is required because this work is strongly about interaction feel.
   - QA should include:
     - desktop and mobile,
     - populated and empty threads,
     - rapid repeated navigations,
     - slow-device or throttled conditions if available,
     - reduced-motion enabled.

6. **Automated checks**
   - Run `pnpm run check-types`.

7. **Prior art**
   - Reuse existing repo testing style for stateful UI controllers and chat behavior.
   - Favor contract-level tests over snapshot-style animation tests.

## Out of Scope

1. App-wide migration of all loading and readiness systems.
2. Full replacement of all legacy load-status consumers.
3. Full rewrite of chat provider topology.
4. View-transition-based navigation redesign.
5. Broader conversation rendering performance work unrelated to reveal orchestration.
6. Sidebar visual redesign.
7. Input visual redesign outside what is required for coherence with reveal state.
8. New product features unrelated to reveal timing and readiness contracts.

## Further Notes

1. The most important design choice is to model reveal as a persistent overlay fade-out, not as a fade-in of the heavy conversation tree.
2. The value of this work is larger than the chat transition itself: it establishes a reusable pattern for explicit UI readiness and reveal ownership.
3. The first implementation should prove that a generic ready-signal contract can stay simple in practice.
4. If this work succeeds, future loading/reveal surfaces should adopt the new coordinator incrementally instead of expanding the legacy global load-status pattern.
5. The best outcome is a deep module with a narrow API: start session, report ready sources, resolve reveal state, render cover.

## Unresolved Questions

1. Should new-chat transitions adopt the exact same reveal policy on day one, or only existing-thread navigation first?
   - Recommended default: adopt the same policy for all conversation-surface navigations.
2. Should legacy global load-status booleans eventually become a thin adapter on top of the reveal system, or remain separate compatibility state?
   - Recommended default: thin adapter during migration, then shrink legacy ownership over time.
