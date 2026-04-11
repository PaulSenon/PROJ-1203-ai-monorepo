# Message Stability Vertical Slices

> Aligned with `plans/message-stability.md`

## Goal

Break the PRD and plan into implementation-ready issues that are:

1. behavior-first,
2. independently grabbable,
3. verifiable end-to-end,
4. sequenced by real blockers instead of by setup work.

This doc intentionally avoids scaffolding-only tickets. File creation, test harness setup, and small refactors should be folded into the first slice that needs them.

## Slice Types

1. **AFK**
   - can be implemented and merged without needing a product/architecture checkpoint from the user.
2. **HITL**
   - requires a human decision, policy sign-off, or a go/no-go review based on measured results.

## Alignment With The Plan

The slices map to the plan like this:

1. **Plan Phase 1** -> Issue 1
2. **Plan Phase 2** -> Issue 2
3. **Plan Phase 3** -> Issues 3, 4, 5
4. **Plan Phase 4** -> Issues 6, 7
5. **Plan Phase 5** -> Issue 8

## Issue 1 - Lock Contracts And Baseline

**Type**: AFK

### Goal

Codify the current transcript contract and establish a measurement baseline before the core merge path is reshaped.

### What to build

1. Add pure scenario fixtures for the current message-source mix.
2. Add behavior tests for:
   - canonical display order,
   - source precedence,
   - lifecycle filtering,
   - pagination prepend/append safety,
   - optimistic apply/revert behavior,
   - ownership handoff parity.
3. Add removable dev-only measurement hooks around the current path for:
   - changed ids vs changed refs,
   - reused row count,
   - assembly timing,
   - cache-write count,
   - visible-row rerender count where feasible.
4. Record the baseline that later slices must beat or at least not regress.

### Why this is a valid slice

This is not scaffolding-only work. It delivers a demoable outcome: the team can now prove current behavior and measure later improvements against a known baseline.

### Acceptance Criteria

1. Pure tests exist for the current ordering, precedence, handoff, optimistic patch, and pagination contracts.
2. Dev-only instrumentation can show changed refs vs changed ids across successive transcript assemblies.
3. No user-visible transcript behavior changes yet.
4. A baseline profile exists for desktop and mobile streaming behavior.

### Blocked by

None - can start immediately.

### User stories covered

12, 13, 18, 21, 25, 27, 29, 30, 31

## Issue 2 - Canonical Assembly With Transcript Parity

**Type**: AFK

### Goal

Extract the non-React assembly engine into pure TypeScript while keeping transcript behavior equivalent.

### What to build

1. Move canonical normalization and merge/precedence logic out of `useMessages` and into pure modules.
2. Preserve the current low-frequency vs high-frequency assembly split.
3. Keep the hook as a thin adapter that gathers raw layers and delegates to the pure engine.
4. Remove the old generic hot-path merge helper once the new assembly path is in place.
5. Avoid a full generic sort on every live update unless a proven invariant still requires it.

### Why this is a valid slice

This is the first true upstream tracer bullet. It delivers an end-to-end outcome: transcript assembly now runs through the new pure core with behavior parity.

### Acceptance Criteria

1. The core assembly path runs without React imports.
2. `useMessages` becomes adapter/wiring code rather than the main home of merge policy.
3. Transcript behavior remains correct for cache, persisted, optimistic, resumed-stream, and HTTP-stream scenarios.
4. Profiling shows no hot-path regression after extraction.

### Blocked by

1. Issue 1

### User stories covered

3, 4, 8, 9, 10, 12, 13, 14, 20, 21, 22, 23, 25, 29, 31

## Issue 3 - Ownership Handoff Stability Across Message Sources

**Type**: AFK

### Goal

Preserve message identity through source handoffs when visible output is unchanged.

### What to build

1. Add schema-aware stabilization after canonical assembly.
2. Reuse previous whole-message refs when the visible result is unchanged.
3. Reuse unchanged `metadata` and unchanged `parts` refs when only part of a row changed.
4. Exclude debug-only source tagging from production reuse decisions.
5. Prove stable handoffs for:
   - cache -> persisted,
   - HTTP -> persisted,
   - optimistic -> persisted,
   - resumed -> persisted.

### Why this is a valid slice

This directly delivers one of the core PRD outcomes: the same logical message no longer visually churns just because ownership changed.

### Acceptance Criteria

1. Visually unchanged rows preserve message identity across successive assemblies.
2. Unchanged parts preserve identity when another row or another part changes.
3. Source handoffs no longer cause avoidable whole-row churn.
4. Debug datasource metadata no longer forces production ref churn.

### Blocked by

1. Issue 2

### User stories covered

3, 4, 8, 15, 16, 17, 18, 21, 25, 27, 29, 32

## Issue 4 - Resumed Stream Continuity Reuses Prior Built State

**Type**: AFK

### Goal

Make resumed streaming continuous across chunk growth and reconnect by reusing prior built state for the same stream lifecycle.

### What to build

1. Add a pure resumed-stream rebuild helper.
2. Seed the rebuild from the prior built message when stream id is unchanged.
3. Reset correctly when stream id changes, skip mode activates, or chunks reset.
4. Integrate this path into the hook without broad state architecture changes.

### Why this is a valid slice

This is a narrow, demoable end-to-end scenario: resumed streaming should change only the unfinished tail instead of rebuilding from zero on every tick.

### Acceptance Criteria

1. Same-stream chunk growth reuses prior built state.
2. New stream id cleanly resets the reuse seed.
3. Empty/reset stream yields no resumed message cleanly.
4. Existing resumed-stream UX remains correct while churn drops.

### Blocked by

1. Issue 2

### User stories covered

5, 10, 19, 21, 25, 27, 29

## Issue 5 - Hot-Path Cache Dedupe And Measurement Gate

**Type**: AFK

### Goal

Finish the upstream hardening pass by deduplicating cache writes and proving the actual gains from Issues 2 to 4.

### What to build

1. Deduplicate cache writes based on meaningful cached-tail change.
2. Keep only React-only adapter concerns inside `useMessages`.
3. Update measurement hooks so the post-stabilization path reports:
   - changed ids vs changed refs,
   - whole-row reuse,
   - parts reuse,
   - resumed rebuild timing,
   - cache-write count.
4. Remove obvious stale debug noise while touching the path.

### Why this is a valid slice

This is the proof and cleanup gate for upstream stabilization. It confirms whether Phase 3 actually delivered enough value before downstream rendering work begins.

### Acceptance Criteria

1. Cache writes only occur when the meaningful cached tail actually changes.
2. The hook reads materially cleaner and more adapter-shaped.
3. Dev metrics can demonstrate the gains from the upstream slices.
4. No user-visible transcript regressions are introduced.

### Blocked by

1. Issue 3
2. Issue 4

### User stories covered

1, 6, 18, 20, 21, 23, 25, 27, 29

## Issue 6 - Settled Rows Use Static Rendering; Active Tail Uses Streaming Path

**Type**: AFK

### Goal

Use the new upstream stability to make settled rows cheap and calm while keeping only the active tail dynamic.

### What to build

1. Split static vs streaming rendering paths for assistant content.
2. Route completed rows through cheaper static behavior.
3. Keep layout-only tail concerns outside message memo boundaries where possible.
4. Verify the virtualized list benefits from stable row props and cheap settled rows.

### Why this is a valid slice

This is the main downstream performance slice. It gives a clear demo outcome: older completed rows stop paying streaming-oriented render cost.

### Acceptance Criteria

1. Completed rows no longer rerun streaming-oriented markdown/render work on unrelated tail updates.
2. The active tail still behaves correctly while streaming.
3. Tail-only layout concerns do not invalidate settled rows.
4. Virtualized list behavior remains correct for prepend, append, and live streaming.

### Blocked by

1. Issue 3
2. Issue 4
3. Issue 5

### User stories covered

1, 2, 5, 6, 7, 11, 16, 17, 26, 28, 29

## Issue 7 - One-Way Settled-Row Consolidation Policy

**Type**: HITL

### Goal

Decide whether to adopt a one-way consolidation rule for mounted settled rows after Phase 4 metrics and UX validation.

### What to build

1. Review Phase 4 measurements and UX behavior.
2. Decide whether a one-way settled-row latch is still needed.
3. If yes, implement the narrowest version that prevents mode oscillation without changing product behavior unexpectedly.
4. If no, explicitly reject it and keep Phase 4 as the terminal downstream shape.

### Why this is HITL

The PRD still leaves this as an unresolved policy decision. It should not be treated as automatic AFK work.

### Acceptance Criteria

1. A clear go/no-go decision exists after reviewing Phase 4 output.
2. If adopted, the rule is narrow, deterministic, and measured.
3. If rejected, the decision and rationale are recorded explicitly.

### Current Decision

Rejected for now.

Rationale:

1. Current explicit static-vs-streaming render policy already prevents the observed mode-oscillation issues on the active path.
2. Measurements were acceptable without adding a one-way settled-row latch.
3. Adding a latch now would increase behavior complexity and risk feature creep for limited proven gain.

### Blocked by

1. Issue 6

### User stories covered

2, 7, 16, 26, 28, 29

## Issue 8 - Granular Per-Message Store Spike And Go/No-Go

**Type**: HITL

### Goal

Only if Phases 1 to 4 are still insufficient, evaluate a hybrid local entity store that separates ordered ids from per-message subscriptions.

### What to build

1. Use the measured results from earlier slices to decide whether escalation is justified.
2. If justified, spike a local per-thread entity store where:
   - the list subscribes to ordered ids,
   - each row subscribes to its own message entity.
3. Compare complexity cost vs measured gain.
4. Produce a clear go/no-go recommendation instead of assuming the store should land.

### Why this is HITL

This is an escalation path, not default scope. Starting it requires a human complexity/perf judgment.

### Acceptance Criteria

1. Phase 8 starts only after explicit evidence that prop-based stabilization is insufficient.
2. The spike proves whether row updates can be isolated more effectively than the prop-based design.
3. A clear go/no-go decision exists.
4. If gains are marginal, the store path is rejected.

### Current Decision

Rejected for now.

Rationale:

1. Phase 1-4 style stabilization work was sufficient for the current MVP path.
2. No current evidence justifies paying the complexity cost of a local entity store.
3. Revisit only if new measurements show prop-based stabilization is no longer sufficient.

### Blocked by

1. Issue 5
2. Issue 6
3. Issue 7 if adopted

### User stories covered

6, 11, 23, 24, 27, 28, 29, 31

## Recommended Ticket Order

1. Issue 1
2. Issue 2
3. Issue 3
4. Issue 4
5. Issue 5
6. Issue 6
7. Issue 7 if needed
8. Issue 8 only if justified

## Suggested PR Strategy

1. PR 1: Issue 1
2. PR 2: Issue 2
3. PR 3: Issue 3
4. PR 4: Issue 4 + Issue 5 if diff stays tight
5. PR 5: Issue 6
6. PR 6: Issue 7 only if adopted
7. PR 7: Issue 8 only if justified

Keep PR boundaries aligned with verifiable behavior. Avoid mixing upstream core extraction with downstream rendering changes in the same PR.

## Unresolved Questions

1. Whether Issue 4 and Issue 5 should stay separate or merge into one PR if the resumed-stream diff is tiny.
2. The exact metric threshold that will unlock or block Issue 8.
