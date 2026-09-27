# PRD - Streamdown Highlight Offload + Upstream UX Deferral

## Problem Statement

Heavy conversations with many code blocks degrade interactivity on client-side navigation.

Observed behavior:

1. Initial full page load often shows raw code quickly, then swaps to highlighted code.
2. Subsequent client-side navigations to heavy code pages can feel blocked for hundreds of ms.
3. INP and perceived responsiveness regress because highlight compute and/or swap work competes with urgent interactions.

Target product outcome:

- instant feedback for user interactions (tap/click/scroll/input)
- critical path renders first (raw code is acceptable)
- highlighting completes eventually, without stealing responsiveness

## Solution

Deliver two parallel tracks in one coordinated effort:

1. **App track (ship path):** app-local Streamdown code highlighter plugin backed by a Web Worker using Shiki JS regex engine.
   - highlight compute leaves main thread
   - raw code remains immediate fallback
   - highlighted result swaps later

2. **Upstream track (contribution path):** single upstream PR with 3 commits:
   - Commit A: offscreen code-block highlight deferral built into Streamdown
   - Commit B: `startTransition` for highlight result swap in Streamdown highlighted-body
   - Commit C: docs recipe for worker-backed custom `CodeHighlighterPlugin`

This keeps MVP realistic: app gets guaranteed local win, upstream may cherry-pick all or part.

## User Stories

1. As a chat user, I want taps/clicks to respond instantly on heavy code pages, so that the app feels native-fast.
2. As a chat user, I want raw code visible immediately, so that content is readable before colors are ready.
3. As a chat user, I want syntax colors to appear eventually, so that readability improves without blocking interactions.
4. As a chat user, I want smooth behavior on iOS Safari, Android browsers, and desktop, so that performance is consistent across devices.
5. As a chat user, I want responsiveness preserved under CPU throttle, so that low-power devices remain usable.
6. As a chat user, I want initial conversation open with bottom-anchored UX to remain correct, so that highlighting never fights initial scroll behavior.
7. As a frontend engineer, I want highlight compute offloaded to worker, so main thread stays free for interaction and layout work.
8. As a frontend engineer, I want Streamdown plugin contract unchanged, so integration risk stays low.
9. As a frontend engineer, I want synchronous cache hits and async misses, so rendering behavior remains predictable.
10. As a frontend engineer, I want single-flight + dedupe + coalescing, so worker jobs never explode under burst updates.
11. As a frontend engineer, I want stale-response guards, so older highlight responses cannot overwrite newer content.
12. As a frontend engineer, I want raw-only fallback if worker path breaks, so UI still renders safely.
13. As a frontend engineer, I want failure logs on worker issues, so we can wire observability later.
14. As a maintainer, I want upstream offscreen deferral as built-in behavior (not consumer intersection hacks), so API remains simple.
15. As a maintainer, I want optional upstream control prop for deferral enablement, so behavior is explicit and non-breaking.
16. As a maintainer, I want upstream highlight swap to use transition priority, so urgent interactions win over cosmetic swaps.
17. As a maintainer, I want docs showing worker plugin pattern, so users can adopt main-thread offload without forking Streamdown.
18. As a reviewer, I want strict scope boundaries, so this does not expand into broad renderer redesign.
19. As a reviewer, I want no WASM phase in this implementation, so risk and policy complexity stay low.
20. As a reviewer, I want one upstream PR branch with 3 separate commits, so maintainers can cherry-pick selectively.

## 'Polishing' Requirements

1. Verify interactions remain instant while highlight jobs are pending.
2. Verify raw code always appears before or instead of highlight (never blank gap).
3. Verify no layout jump from raw -> highlighted swap beyond current baseline.
4. Verify initial bottom-anchor behavior remains stable in heavy conversations.
5. Verify offscreen deferral does not starve visible code blocks.
6. Verify worker error path logs exactly once per failure class (avoid console spam).
7. Verify dual-theme output parity (light/dark) with existing behavior.
8. Verify docs are actionable with copy-paste baseline and no framework overclaim.

## Implementation Decisions

1. **Engine strategy**
   - Use Shiki JS regex engine in worker for this phase.
   - WASM mode remains deferred.

2. **App plugin contract**
   - Implement Streamdown `CodeHighlighterPlugin` semantics exactly:
     - cache hit => return highlighted result synchronously
     - cache miss => return `null`, resolve via callback later

3. **App scheduling model**
   - Single worker instance.
   - Single-flight per cache key.
   - Dedupe in-flight identical requests.
   - Coalesce rapid updates to newest pending state.
   - Prefer latest visible user context over strict historical FIFO.

4. **Stale protection model**
   - Every request tagged with monotonic request id/version.
   - Ignore outdated responses on arrival.

5. **Fallback model**
   - On worker init/runtime failure, degrade to raw-only highlighting behavior.
   - Emit error log for diagnostics.

6. **Upstream deferral API (commit A)**
   - Add built-in code-block offscreen deferral inside Streamdown internals.
   - Expose one minimal consumer-facing control prop:
     - `deferCodeBlocks?: boolean`
   - Default: `false` (non-breaking baseline).
   - Behavior scope:
     - `true`: Streamdown defers expensive code highlight path until code block is near/inside viewport.
     - `false`: preserve current eager behavior.
   - Consumer does **not** implement intersection logic manually.

7. **Upstream transition priority (commit B)**
   - Wrap highlighted result state updates in `startTransition` within highlighted-body.
   - Goal: lower priority for visual token swap; keep urgent interactions responsive.

8. **Upstream docs recipe (commit C)**
   - Add docs section: worker-backed custom code plugin pattern.
   - Include:
     - adapter contract mapping
     - request/response protocol shape
     - cache + callback fanout notes
     - fallback guidance

9. **Branching and contribution flow**
   - Use user fork repo for upstream work.
   - Sync `main` with upstream `main` first.
   - Create feature branch from synced `main`.
   - Keep one PR with 3 isolated commits.

10. **Scope lock**
   - No redesign of markdown UI.
   - No message virtualization work in this PRD.
   - No data-layer protocol changes.

## Testing Decisions

1. **Test philosophy**
   - Test external behavior, not internals.
   - Verify observable responsiveness and rendering order guarantees.

2. **App modules to test**
   - Worker bridge adapter (contract behavior).
   - Scheduler/coalescing logic.
   - Stale response guard.
   - Fallback/error logging behavior.

3. **Upstream modules to test**
   - Code-block deferral behavior (`deferCodeBlocks` true/false).
   - Highlighted-body transition swap path.
   - Docs lint/build validation (where applicable).

4. **Required behavior checks**
   - Cache hit sync return.
   - Cache miss async callback.
   - Burst updates coalesce, no unbounded queue growth.
   - Out-of-order responses ignored.
   - Worker failure still renders raw code and logs error.
   - Offscreen blocks defer when enabled; visible blocks render promptly.

5. **Manual performance matrix**
   - iOS Safari heavy thread, CPU throttle.
   - Android browser heavy thread, CPU throttle.
   - Desktop heavy thread, CPU throttle.
   - Success condition: instant interaction feedback first, eventual highlight completion.

## Out of Scope

1. WASM engine mode.
2. Publishing generic npm worker package.
3. Full Streamdown architectural rewrite.
4. New markdown feature set (tables/math/mermaid behavior redesign).
5. Any non-highlight chat feature work.

## Further Notes

1. This PRD intentionally prioritizes responsiveness over eager completeness.
2. Raw-first rendering is acceptable and required for UX target.
3. Upstream API kept minimal to avoid feature creep.
4. Upstream and app tracks are complementary, not mutually exclusive.
5. App track should be shippable even if upstream accepts only subset of commits.

## Acceptance Criteria

1. App uses worker-backed Streamdown code plugin with JS engine.
2. Heavy client-side navigation no longer causes major interaction jank from highlight compute.
3. Raw code remains immediate fallback on heavy pages.
4. Worker errors degrade to raw-only and log diagnostic error.
5. Upstream branch includes 3 commits (defer, transition, docs) in one PR.
6. Upstream code-block deferral has concrete, minimal public control via `deferCodeBlocks`.

## Unresolved Questions

- none
