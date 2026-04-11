# Message Stability Module Design

> Aligned with `plans/message-stability.md`

## Goal

Extract the sensitive `useMessages` merge/stability logic into a small pure TypeScript core that:

1. owns source normalization,
2. owns canonical ordering,
3. owns source precedence,
4. owns referential stabilization,
5. keeps React hooks as thin adapters only.

## Non-Goals

1. Do not introduce an external store in the first pass.
2. Do not redesign provider ownership.
3. Do not redesign virtualization.
4. Do not introduce generic deep-equality or recursive structural reuse for arbitrary shapes.
5. Do not expand message product behavior.

## Alignment With The Plan

### Plan Phase 1 - Lock Contracts And Baseline

This phase should happen before major extraction work.

Implication for module design:

1. design the future public interfaces now,
2. but implement baseline behavior tests first,
3. do not start by moving files around without contract coverage.

### Plan Phase 2 - Extract Canonical Assembly Core

This phase introduces the new pure-core folder and wires `useMessages` through it without yet depending on broad stabilization behavior.

### Plan Phase 3 - Add Referential Stabilization And Seeded Stream Rebuild

This phase deepens the extracted core with:

1. message/parts/metadata reuse,
2. resumed-stream seeded rebuild,
3. cache-write dedupe support.

### Plan Phase 4 - Harden Downstream Rendering

This phase should consume the stable upstream contracts. It should not force a redesign of the pure-core APIs unless a real gap is discovered.

### Plan Phase 5 - Conditional Granular Store Escalation

This phase is optional. The module design should not assume a store from day one. If a store appears later, it should consume the pure assembly engine rather than replace it.

## Proposed Location

Create a new pure-core folder:

`apps/web/src/lib/message-assembly/`

No barrel export.

Suggested file layout:

1. `message-assembly.types.ts`
2. `normalize-message-source.ts`
3. `assemble-messages.ts`
4. `stabilize-assembled-messages.ts`
5. `rebuild-resumed-stream-message.ts`
6. `message-assembly.fixtures.ts`
7. `*.test.ts` files next to the pure modules

Keep `apps/web/src/hooks/use-messages.tsx` as the React adapter and migration seam.

## Target Shape

### 1. Core types

`message-assembly.types.ts`

```ts
import type {
  MessageDataSource,
  MyUIMessage,
  MyUIMessageChunk,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";

declare const normalizedMessagesBrand: unique symbol;

export type MessageSourceKind =
  | "cache"
  | "persisted"
  | "optimistic"
  | "resumed-stream"
  | "http-stream"
  | "base";

export type NormalizedMessages = readonly MyUIMessage[] & {
  readonly [normalizedMessagesBrand]: true;
};

export type MessageLayer<TKind extends MessageSourceKind = MessageSourceKind> = {
  kind: TKind;
  messages: NormalizedMessages;
  dataSource?: MessageDataSource;
};

export type MessageAssemblyInput = {
  cache: NormalizedMessages;
  persisted: NormalizedMessages;
  optimistic: NormalizedMessages;
  resumed: NormalizedMessages;
  http: NormalizedMessages;
  previous?: MessageAssemblySnapshot;
  options?: {
    enableDebugDataSource?: boolean;
  };
};

export type MessageAssemblySnapshot = {
  messages: readonly MyUIMessage[];
  messageIndexById: ReadonlyMap<string, number>;
};

export type ResumedStreamBuildInput = {
  streamId: string;
  chunks: readonly MyUIMessageChunk[];
  previous?: ResumedStreamBuildSnapshot | null;
};

export type ResumedStreamBuildSnapshot = {
  streamId: string;
  message: MyUIMessage;
};
```

Notes:

1. `NormalizedMessages` stays branded.
2. `MessageAssemblySnapshot` stores `messageIndexById` because stabilization and overlay replacement both want it.
3. Keep snapshot small. Do not pre-build speculative caches.

### 2. Source normalization

`normalize-message-source.ts`

```ts
export function normalizeCacheMessages(
  messages: readonly MyUIMessage[] | undefined
): NormalizedMessages;

export function normalizePersistedMessages(
  messages: readonly MyUIMessage[] | undefined
): NormalizedMessages;

export function normalizeOptimisticMessages(
  messages: readonly MyUIMessage[] | undefined
): NormalizedMessages;

export function normalizeResumedMessages(
  messages: readonly MyUIMessage[] | undefined
): NormalizedMessages;

export function normalizeHttpMessages(
  messages: readonly MyUIMessage[] | undefined
): NormalizedMessages;
```

Rules:

1. All normalized lists become oldest -> newest.
2. Persisted paginated query currently arrives newest -> oldest, so normalization is the only place allowed to reverse it.
3. Dev-only order assertions stay here.
4. These functions must not clone unless required for order correction.

### 3. Canonical assembly

`assemble-messages.ts`

```ts
export type AssembleBaseMessagesInput = {
  cache: NormalizedMessages;
  persisted: NormalizedMessages;
  optimistic: NormalizedMessages;
  enableDebugDataSource: boolean;
};

export function assembleBaseMessages(
  input: AssembleBaseMessagesInput
): MessageAssemblySnapshot;

export type AssembleLiveOverlayInput = {
  base: MessageAssemblySnapshot;
  resumed: NormalizedMessages;
  http: NormalizedMessages;
  previous?: MessageAssemblySnapshot;
  enableDebugDataSource: boolean;
};

export function assembleMessages(
  input: MessageAssemblyInput
): MessageAssemblySnapshot;
```

Rules:

1. Keep the current broad performance shape:
   - low-frequency base: cache + persisted + optimistic
   - high-frequency overlays: resumed + http
2. Do not do a final generic full sort on every hot update.
3. Base assembly may pay more work than live overlay assembly because it changes less often.

### 4. Stabilization

`stabilize-assembled-messages.ts`

```ts
export type StabilizeMessagesInput = {
  previous?: readonly MyUIMessage[];
  next: readonly MyUIMessage[];
  options?: {
    ignoreDebugDataSource?: boolean;
    ignoreMetadataUpdatedAt?: boolean;
  };
};

export function stabilizeAssembledMessages(
  input: StabilizeMessagesInput
): readonly MyUIMessage[];

export function stabilizeMessage(
  previous: MyUIMessage | undefined,
  next: MyUIMessage,
  options: Required<NonNullable<StabilizeMessagesInput["options"]>>
): MyUIMessage;

export function stabilizeMessageMetadata(
  previous: MyUIMessageMetadata | undefined,
  next: MyUIMessageMetadata | undefined,
  options: Required<NonNullable<StabilizeMessagesInput["options"]>>
): MyUIMessageMetadata | undefined;

export function stabilizeMessageParts(
  previous: readonly MyUIMessage["parts"],
  next: readonly MyUIMessage["parts"]
): readonly MyUIMessage["parts"];
```

Rules:

1. Stabilization is schema-aware.
2. Stabilize by id only.
3. Reuse previous whole message when visible output is unchanged.
4. If whole message cannot be reused, still try to reuse `metadata` and unchanged `parts` entries.
5. Do not recurse blindly through arbitrary nested objects.
6. Part comparison should be shape-aware and local.

### 5. Resumed stream rebuild

`rebuild-resumed-stream-message.ts`

```ts
import { createUiMessageFromChunks } from "@ai-monorepo/ai/libs/createUiMessageFromChunks";

export async function rebuildResumedStreamMessage(
  input: ResumedStreamBuildInput
): Promise<ResumedStreamBuildSnapshot | null>;
```

Rules:

1. If `previous?.streamId === input.streamId`, seed `createUiMessageFromChunks` with `previous.message`.
2. If stream id changed, do not seed.
3. Return `null` when chunks are empty.
4. This module stays pure except for the async builder call.

## Hook Integration Plan

`use-messages.tsx` should end up as a thin adapter with 5 responsibilities only:

1. read source data from React/Convex/AI SDK hooks,
2. normalize each source through pure helpers,
3. build resumed streamed message through the pure resumed-stream helper,
4. call `assembleMessages({ ..., previous })`,
5. expose statuses and optimistic patch APIs.

Everything else should move out.

## Proposed `useMessages` Internal Split

Keep these React-only concerns inside the hook:

1. Convex reactive query wiring
2. cache entry hook wiring
3. optimistic patch state ownership
4. throttling of rapidly changing source values
5. cache write side effect
6. loading/stale status derivation

Move these non-React concerns out:

1. normalization
2. merge policy
3. source precedence
4. debug datasource annotation logic
5. message stabilization
6. resumed-stream seeded reconstruction logic

## Assembly Algorithm

### Base assembly algorithm

Input: normalized `cache`, `persisted`, `optimistic`

Target behavior:

1. start from cache snapshot
2. overlay persisted by id
3. append persisted ids not present in cache
4. overlay optimistic by id
5. append optimistic ids not yet present
6. filter deleted/archived once
7. preserve canonical oldest -> newest order

Recommended implementation detail:

1. build a mutable `list` from the first stable layer
2. build `indexById` once
3. overlay by replacing existing indices or appending new ids
4. avoid a generic `sort(compareMessages)` at the end unless a concrete invariant failure forces it

### Live overlay algorithm

Input: `base`, `resumed`, `http`

Target behavior:

1. clone only the base message array shell
2. reuse base message refs by default
3. overlay resumed by id or append if missing
4. overlay http by id or append if missing
5. stabilize against `previous` before returning

## Metadata Policy

Initial policy proposal:

1. `metadata.debug.dataSource`
   - dev-only concern
   - ignore in production stabilization
   - ideally avoid attaching at all in production
2. `metadata.updatedAt`
   - treat as non-visual unless a current consumer proves otherwise
   - make this an explicit stabilization option so the rule is not hidden
3. `metadata.liveStatus`, `metadata.error`, `metadata.usage`, `metadata.timing`
   - treat as visual or behaviorally relevant
   - must break reuse when the rendered result depends on them

## Part Stabilization Policy

Recommended first-pass rule:

1. compare `parts.length`
2. compare each part `type`
3. for known part shapes, compare only fields that affect rendered output
4. reuse the previous part ref when those fields are unchanged
5. if every part ref is reused and metadata is reused, prefer reusing the previous whole message

Keep this intentionally narrow.

## Resumed Stream Policy

Recommended internal state in `useMessages`:

```ts
const previousResumedSnapshotRef = useRef<ResumedStreamBuildSnapshot | null>(null);
```

Flow:

1. throttled chunks update
2. call `rebuildResumedStreamMessage({ streamId, chunks, previous })`
3. if same stream id, seed prior message
4. store new snapshot in ref
5. reset ref on stream reset or skip mode

## Suggested Implementation Order

Aligned with the plan:

1. write baseline behavior tests and instrumentation first
2. add `message-assembly.types.ts`
3. add `normalize-message-source.ts`
4. add `assemble-messages.ts` without broad stabilization first
5. integrate canonical assembly into the hook
6. add `stabilize-assembled-messages.ts`
7. add `rebuild-resumed-stream-message.ts`
8. integrate seeded resumed-stream rebuild into the hook
9. add cache-write dedupe support
10. remove dead generic merge helpers from the hook

## Migration Notes

1. Land the pure core behind the current hook API first.
2. Do not rename the public hook in the same change.
3. Keep old helper names only until their callsites migrate, then delete them quickly.
4. Prefer one migration pass over long-lived duplicated merge code.

## Success Criteria

1. `useMessages` becomes materially smaller and more adapter-shaped.
2. Pure core tests cover the sensitive merge/stability contract.
3. Streaming only changes the active tail in common cases.
4. Completed rows keep stable message refs across cache/persisted/http/resumed handoffs when visually unchanged.
5. No external store is needed to reach an acceptable baseline.

## Unresolved Questions

1. Whether `updatedAt` should be ignored by default in stabilization.
2. Whether any non-text parts need special-case comparators beyond shallow field checks in the first pass.
3. Whether the snapshot object should later expose debug stats in DEV, or whether instrumentation should remain separate.
