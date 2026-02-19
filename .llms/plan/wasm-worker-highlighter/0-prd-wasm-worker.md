# PRD - Streamdown Custom Worker Highlighter (JS First, WASM Phase 2)

## Problem Statement

In our Vite CSR app, Streamdown code highlighting currently runs in the main UI thread via plugin calls. Under high streaming frequency and long code blocks, highlighting can create avoidable UI contention. We need a framework-specific solution that:

1. Offloads highlighting from main thread.
2. Preserves Streamdown plugin contract and rendering behavior.
3. Avoids over-engineering and feature creep.
4. Starts with lowest-risk engine choice (JS engine), then optionally upgrades to WASM engine.

We also need clarity on worker/CSP constraints so implementation is deterministic, not "mystical".

## Solution

Build an app-local custom Streamdown `CodeHighlighterPlugin` backed by a dedicated Web Worker.

Phase 1 (in-scope now):

- Worker-based highlighting using Shiki JavaScript regex engine.
- Main-thread adapter implementing Streamdown plugin interface.
- Deterministic scheduling (single-flight + latest-only queue) to avoid piling up highlight jobs.
- Strong stale-response protection (request ids/version guard).
- CSP profile documented and validated for worker mode without WASM.

Phase 2 (planned/deferred):

- Optional WASM engine mode in worker for additional language fidelity/perf experiments.
- CSP/runtime/asset changes documented and gated by explicit opt-in config.

## User Stories

1. As a chat user, I want code highlighting to not stall typing/scrolling, so that streaming feels smooth.
2. As a chat user, I want code to remain readable while highlighting resolves, so that content is never blocked.
3. As a chat user, I want long code blocks to behave consistently, so that UX does not degrade under load.
4. As a frontend engineer, I want to keep Streamdown integration intact, so that migration risk stays low.
5. As a frontend engineer, I want worker mode to be app-local, so that we avoid npm packaging complexity.
6. As a frontend engineer, I want deterministic scheduling, so that new chunks do not spawn unbounded work.
7. As a frontend engineer, I want stale worker responses ignored, so that old results never overwrite fresh state.
8. As a frontend engineer, I want cache hits to return synchronously, so that repeat code renders fast.
9. As a frontend engineer, I want callback fan-out per cache key, so that duplicate in-flight requests share one result.
10. As a frontend engineer, I want explicit worker init/error handling, so that failures degrade gracefully.
11. As a security reviewer, I want exact CSP requirements documented, so rollout is predictable.
12. As a security reviewer, I want JS-engine worker mode to avoid WASM policy requirements, so baseline security posture stays strict.
13. As a performance reviewer, I want lightweight worker payloads and no unnecessary cloning, so IPC overhead stays controlled.
14. As a maintainer, I want clear phase boundaries (JS first, WASM later), so scope remains focused.
15. As a maintainer, I want observability counters around queueing and latency, so regressions are detectable.
16. As a maintainer, I want the solution to be Vite-native, so worker loading stays reliable in this app.
17. As a maintainer, I want fallback behavior to existing plugin path, so user-facing failures are minimized.
18. As a maintainer, I want no assumptions about passing refs/functions across worker boundary, so message protocol is correct by design.
19. As a maintainer, I want compatibility with append-only streaming, so scheduling logic can stay simple.
20. As a maintainer, I want explicit out-of-scope boundaries, so this does not drift into broad Streamdown refactors.

## 'Polishing' Requirements

1. Verify worker startup path is stable in production build and local dev build.
2. Ensure no uncaught worker errors surface to users.
3. Ensure fallback path preserves readable code rendering if worker init fails.
4. Ensure logs are concise and gated (debug flag) to avoid console noise.
5. Ensure queue/coalescing behavior is observable in debug tooling.
6. Ensure docs include CSP snippets for JS-worker and WASM-worker profiles.
7. Ensure implementation notes clearly state structured-clone limitations.
8. Ensure decision log states why JS-first path is chosen.

## Implementation Decisions

1. **Execution model**
   - Use a dedicated worker for highlight execution.
   - Main thread owns Streamdown plugin contract only.
   - Worker owns Shiki highlighter lifecycle and token generation.

2. **Plugin contract**
   - Keep Streamdown `CodeHighlighterPlugin` semantics unchanged.
   - `highlight(options, callback)` returns cached result immediately or `null` for async path.
   - Async result delivery remains callback-based.

3. **Scheduling model (critical)**
   - One active highlight per logical code-block key.
   - If new request arrives while active, keep latest request only; drop intermediate queued requests.
   - No unbounded queue growth.

4. **Stale response protection**
   - Every request carries monotonically increasing request id.
   - Main thread ignores responses not matching current latest expected id.
   - Prevents out-of-order overwrite.

5. **Caching model**
   - Cache key based on language + themes + deterministic code signature.
   - Cache resides in adapter (for sync return path) and optional worker-level memoization.
   - Subscriber fan-out map avoids duplicate in-flight work per key.

6. **Message protocol**
   - Typed messages: `init`, `highlight`, `result`, `error`, optional `stats`.
   - Payloads use structured-clone-safe data only.
   - No function/ref/DOM handles across boundary.

7. **Worker instantiation in Vite**
   - Use module worker URL pattern supported by Vite.
   - Keep worker entry app-local and framework-specific.

8. **Engine strategy**
   - Phase 1 default: Shiki JavaScript regex engine in worker.
   - Phase 2 optional: WASM engine mode in worker under explicit config flag.
   - No WASM in phase 1.

9. **CSP model (non-mystical, explicit)**
   - Worker loading controlled by `worker-src` (falls back to `child-src`, then `script-src`, then `default-src` if absent).
   - JS-engine worker mode does not require `wasm-unsafe-eval`.
   - WASM mode may require `script-src 'wasm-unsafe-eval'` depending runtime path.
   - Prefer same-origin worker script URL over blob worker for predictable policy behavior.

10. **Failure behavior**
    - On worker init/highlight failure, degrade to existing non-worker plugin behavior.
    - Never block rendering.

11. **Performance guardrails**
    - Coalescing + stale guards are mandatory.
    - Keep payloads minimal (avoid heavy nonessential metadata).
    - Measure end-to-end highlight latency and queue pressure.

12. **Module decomposition (deep modules)**
    - Worker Bridge Adapter: exposes Streamdown plugin interface.
    - Highlight Scheduler: single-flight + latest-only queue policy.
    - Worker Runtime: Shiki init + highlight execution.
    - Protocol Types: request/response contracts.
    - Fallback Controller: recovery to non-worker mode.

## Testing Decisions

1. **Testing principle**
   - Test external behavior contracts, not internal implementation details.
   - Validate plugin-visible semantics and user-visible outcomes.

2. **Modules to test**
   - Worker Bridge Adapter behavior.
   - Scheduler/coalescing logic.
   - Stale-response guard logic.
   - Fallback controller.
   - Worker protocol serialization compatibility.

3. **Required automated tests**
   - Cache hit returns result synchronously.
   - Cache miss returns `null` and eventually triggers callback once.
   - Multiple rapid updates collapse to latest-only execution.
   - Out-of-order worker responses are ignored.
   - Worker error triggers fallback path and continues rendering.
   - No function/ref values are sent in messages.

4. **Manual validation checklist**
   - Long streaming code block stress test in browser.
   - Verify no major main-thread long-task spikes attributable to highlight path.
   - Verify worker mode under strict CSP profile (JS engine).
   - Confirm fallback behavior by forcing worker failure.

5. **Prior art alignment**
   - Reuse existing Streamdown code-block test style for plugin behavior semantics.
   - Add focused adapter/worker tests for protocol and scheduling.

## Out of Scope

1. Publishing a reusable npm package for worker highlighter.
2. Reworking Streamdown internals or plugin APIs upstream.
3. Incremental lexer/token patching architecture.
4. Non-Vite framework compatibility guarantees.
5. WASM mode rollout in phase 1.
6. UI redesign of code blocks.

## Further Notes

1. Worker boundary facts:
   - Data crossing worker boundary uses structured clone.
   - Refs/functions/DOM nodes are not transferable via `postMessage`.
   - Some binary resources can be transferred (ownership move) using transferables for efficiency.

2. CSP facts to lock once and keep stable:
   - Define explicit `worker-src` for worker script origin.
   - Keep strict `script-src` policy for JS-only phase.
   - Add `wasm-unsafe-eval` only when phase-2 WASM mode is enabled and verified.

3. Scope discipline:
   - Deliver JS-worker path first.
   - Capture WASM mode as explicit follow-up track.

## Acceptance Criteria

1. Streamdown renders via custom app-local code plugin backed by worker in Vite CSR.
2. Highlight execution no longer occurs on main thread in phase 1 path.
3. Scheduler enforces single-flight + latest-only coalescing.
4. Stale/out-of-order responses cannot overwrite latest state.
5. Strict CSP baseline works for JS-engine worker mode without wasm policy relaxations.
6. Fallback path handles worker failures without user-visible breakage.
7. WASM mode is specified but deferred, with clear upgrade checklist.

## Unresolved Questions

- none

## References

1. Streamdown plugin API and usage docs.
2. Streamdown code highlighter plugin contract and code-block integration.
3. Streamdown historical discussions: worker/perf thread and CSP/engine fixes.
4. Shiki docs: best-performance (workers), regex engines (JS vs Oniguruma/WASM).
5. MDN: Web Workers, structured clone, transferable objects, CSP `worker-src`, CSP `script-src` + `wasm-unsafe-eval`.
