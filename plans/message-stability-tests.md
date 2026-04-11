# Message Stability TDD Matrix

> Aligned with `plans/message-stability.md`

## Goal

Define a TDD-friendly, behavior-first Vitest strategy for the extracted message-assembly core.

This version intentionally follows vertical slices, not module-by-module test ordering.

## Repo Constraints

1. `apps/web/vitest.config.ts` uses `environment: "node"`
2. test include is `src/**/*.test.ts`
3. best first-pass target is pure-core logic, not React hook or DOM rendering

## Prior Art

Follow the style of:

`apps/web/src/lib/visibility-coordinator/coordinator-core.test.ts`

Good properties to copy:

1. deterministic pure-core tests,
2. behavior-oriented cases,
3. readable fixture helpers,
4. refactor-resistant assertions.

## Public Interfaces To Test First

The first-pass tests should prefer these public interfaces:

1. `assembleMessages(...)`
2. `rebuildResumedStreamMessage(...)`

Only add direct helper-level tests when a helper exposes an important durable contract that is awkward to express through the two interfaces above.

## What TDD Means Here

Correct TDD order for this feature:

1. pick one externally meaningful behavior,
2. write one failing test,
3. write minimum code to pass,
4. refactor only after green,
5. repeat.

Incorrect order for this feature:

1. write all normalization tests,
2. then all assembly tests,
3. then all stabilization tests,
4. then all resumed-stream tests.

That would be horizontal slicing and should be avoided.

## Fixture Strategy

`message-assembly.fixtures.ts` should provide small deterministic builders.

Recommended helpers:

```ts
export function makeUserMessage(overrides?: Partial<MyUIMessage>): MyUIMessage;
export function makeAssistantMessage(overrides?: Partial<MyUIMessage>): MyUIMessage;
export function makeTextPart(text: string): MyUIMessage["parts"][number];
export function makeReasoningPart(text: string): MyUIMessage["parts"][number];
export function makeMetadata(overrides?: Partial<MyUIMessageMetadata>): MyUIMessageMetadata;
export function makeAssemblyInput(overrides?: Partial<MessageAssemblyInput>): MessageAssemblyInput;
```

Fixture rules:

1. timestamps explicit and deterministic
2. ids explicit and readable
3. default order oldest -> newest unless testing normalization
4. handoff scenarios easy to read in one screen

## Recommended First 5 Red-Green-Refactor Cycles

### Cycle 1 - Persisted handoff tracer bullet

Public interface:

`assembleMessages(...)`

Behavior:

1. cache has `m1`
2. persisted has same `m1` in backend order
3. assembled transcript contains one canonical `m1`

Why first:

This proves canonical ordering + overlay-by-id in one narrow end-to-end slice.

### Cycle 2 - Stable ownership handoff

Public interface:

`assembleMessages(...)`

Behavior:

1. previous assembly came from cache-only
2. next assembly adds visually identical persisted `m1`
3. final `m1` keeps the same object ref

Why second:

This is the first true ref-stability contract.

### Cycle 3 - Streaming tail growth isolates churn

Public interface:

`assembleMessages(...)`

Behavior:

1. settled `m1` stays unchanged
2. active `m2` grows
3. `m1` ref stays stable
4. `m2` changes

Why third:

This proves the hot path only churns where visible output changes.

### Cycle 4 - HTTP to persisted seamless handoff

Public interface:

`assembleMessages(...)`

Behavior:

1. previous tick has HTTP-owned `m2`
2. next tick persisted owns the same visible `m2`
3. transcript still has one `m2`
4. unchanged identity is preserved where safe

Why fourth:

This is one of the highest-value real handoff cases in the PRD.

### Cycle 5 - Pagination prepend preserves newer rows

Public interface:

`assembleMessages(...)`

Behavior:

1. transcript already has newer `m2`, `m3`
2. older page adds `m0`, `m1`
3. newer refs for `m2`, `m3` stay stable

Why fifth:

This proves prepend safety without disturbing the active visible tail.

## Behavior Matrix

These are the main behavior slices to cover. They should drive test order. Module-specific helper tests come later only if needed.

### Slice A - Canonical transcript assembly

Primary public interface:

`assembleMessages(...)`

Core behaviors:

1. persisted backend order becomes canonical display order
2. cache + persisted same id produce one final message
3. optimistic patch overrides matching base id
4. optimistic patch appends when id is new
5. deleted messages are excluded
6. archived messages are excluded
7. prepending older history preserves canonical order
8. appending newer persisted history preserves canonical order

### Slice B - Ownership handoff stability

Primary public interface:

`assembleMessages(...)`

Core behaviors:

1. cache -> persisted preserves unchanged row identity
2. HTTP -> persisted preserves unchanged row identity
3. optimistic -> persisted preserves unchanged row identity where output matches
4. resumed -> persisted preserves unchanged row identity where output matches
5. only changed row churns when one tail row changes

### Slice C - Parts and metadata stability

Primary public interface:

`assembleMessages(...)`

Core behaviors:

1. unchanged parts preserve identity when another part grows
2. unchanged metadata preserves identity when only non-visual fields differ according to policy
3. visible metadata changes break reuse
4. unchanged neighboring rows keep identity when one row changes

Important note:

These are still public-contract tests because the PRD explicitly cares about row and sub-prop referential stability.

### Slice D - Resumed stream continuity

Primary public interface:

`rebuildResumedStreamMessage(...)`

Core behaviors:

1. empty chunks return `null`
2. same stream id reuses prior built state
3. new stream id resets prior state
4. chunk growth on same stream preserves earlier settled content where possible
5. resumed message continues correctly across reconnect-style progression

### Slice E - Pagination and optimistic isolation

Primary public interface:

`assembleMessages(...)`

Core behaviors:

1. loading older history does not churn newer settled rows
2. optimistic apply changes only targeted ids
3. optimistic revert restores prior stable rows where output matches

### Slice F - Production vs debug-source behavior

Primary public interface:

`assembleMessages(...)`

Core behaviors:

1. production-style assembly does not churn rows only because of debug datasource decoration
2. debug decoration, if enabled, does not break transcript correctness

## Targeted Helper-Level Tests

Helper-level tests are allowed only after the behavior slices above exist.

Good candidates:

1. `normalizePersistedMessages(...)`
   - backend newest -> oldest becomes canonical oldest -> newest
2. dev-only normalization warning helper
   - warns on non-canonical input in DEV only

Avoid early helper-level tests for:

1. shared empty-array identity
2. exact internal call strategy
3. internal helper decomposition

## Assertion Style

Use both structural and referential assertions.

Structural examples:

1. `expect(messages.map((m) => m.id)).toEqual([...])`
2. `expect(messages.at(-1)?.parts).toEqual([...])`

Referential examples:

1. `expect(next[0]).toBe(prev[0])`
2. `expect(next[1]?.metadata).toBe(prev[1]?.metadata)`
3. `expect(next[2]?.parts[0]).toBe(prev[2]?.parts[0])`
4. `expect(next[2]).not.toBe(prev[2])`

Do not use profiler timings as assertions. Identity stability is the durable contract.

## Recommended Test Files

Start with:

1. `apps/web/src/lib/message-assembly/assemble-messages.test.ts`
2. `apps/web/src/lib/message-assembly/rebuild-resumed-stream-message.test.ts`
3. `apps/web/src/lib/message-assembly/message-assembly.fixtures.ts`

Add later only if useful:

4. `apps/web/src/lib/message-assembly/normalize-message-source.test.ts`
5. `apps/web/src/lib/message-assembly/message-assembly.integration.test.ts`

## What Not To Test

1. private helper call counts
2. exact helper/file structure
3. React memo behavior directly
4. profiler timings
5. Convex hook internals
6. AI SDK internals beyond the public rebuild contract
7. whether a specific seeding call was attempted internally

## Explicit Non-Goal For This Matrix

Cache-write dedupe is not a first-pass pure-core test target.

It belongs to:

1. a tiny pure helper later, if extracted,
2. or adapter/integration coverage after the core assembly path is stable.

Do not let it distort the first TDD slices.

## Exit Criteria For Phase 1-3 Core Tests

1. canonical assembly behavior is covered
2. at least 3 ownership handoff scenarios are covered
3. row-level and part-level stability are covered through public interfaces
4. resumed-stream continuity is covered
5. pagination prepend/append stability is covered
6. prod-vs-debug-source behavior is covered

## Unresolved Questions

1. Whether any current non-text part types need dedicated fixtures immediately or can wait until first real failing behavior.
2. Whether `updatedAt` should be treated as non-visual by default in the first stabilization contract.
