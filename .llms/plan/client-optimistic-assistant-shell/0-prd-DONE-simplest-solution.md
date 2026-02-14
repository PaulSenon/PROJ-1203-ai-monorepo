# PRD — Client Optimistic Assistant Shell (Simplest Solution)

## Document Meta

- Status: ready-for-implementation
- Scope: apps/web only
- Priority: high UX consistency
- Authoring intent: minimal code, readable, no architecture churn

## TL;DR

Add a **derived render-only assistant shell** on top of `useMessages()` output, inside `ActiveThreadProvider` (`apps/web/src/hooks/use-chat-active.tsx`).

No data-layer mutation. No `useEffect`. No cache writes for fake shell.

Shell object must be created via `createOptimisticStepStartMessage` from `packages/ai/src/helpers.ts`.

---

## 1) Context (Current Architecture)

### 1.1 Message pipeline today

- `useMessages` (`apps/web/src/hooks/use-messages.tsx`) merges layers: cache, persisted, optimistic patches, convex resumed stream, HTTP stream.
- Merge key is `message.id`.
- `useMessages` result is cached via `useUserCacheEntryOnce`.

### 1.2 Active thread orchestration

- `ActiveThreadProvider` (`apps/web/src/hooks/use-chat-active.tsx`) consumes `useMessages` and thread query.
- It already computes:
  - `isWaitingForFirstToken = thread.liveStatus === "pending" && lastMessage.role === "user"`
  - `isStreamingOptimistic = isStreaming || isWaitingForFirstToken`
- But UI message list currently exposes raw `messages` only.

### 1.3 Existing shell helper

- Shared helper exists and must be reused:
  - `createOptimisticStepStartMessage(messageUuid)`
  - file: `packages/ai/src/helpers.ts`

### 1.4 UX gap

- After user send, there is a short window where:
  - last rendered message is user
  - thread is ongoing (`pending`/early stream)
  - assistant shell not yet visible in merged list
- This causes inconsistent UI rhythm.

---

## 2) Problem Statement

Need guaranteed UI invariant:

> If thread expects assistant response, UI must never end with user bubble only.

Must achieve without:

- temp-id reconciliation complexity in data layer
- touching server protocol
- `useEffect`-driven delayed patching

---

## 3) Goals

1. Render assistant shell immediately, synchronously, on first render pass where needed.
2. Keep code minimal and readable.
3. Keep `useMessages` raw data semantics unchanged.
4. Avoid duplicate/ghost shell.
5. Keep performance O(1) check + O(n) copy only when shell appended.

---

## 4) Non-Goals (Out of Scope)

- No server/API contract change.
- No client-provided assistant ID protocol.
- No optimistic patch insertion for assistant in `useMessages`.
- No Convex paginated optimistic insert for message shell.
- No changes to `packages/api` or `packages/backend`.
- No message schema/type changes.

---

## 5) User Stories

1. As a chat user, after sending a message, I immediately see assistant "thinking" shell.
2. As a chat user, when first assistant token arrives, shell transitions naturally to real assistant message (no duplicate flash).
3. As a chat user, if I refresh while thread pending, shell is still shown consistently.
4. As a developer, I keep core merge/cache logic untouched and easy to reason about.

---

## 6) Requirements

## 6.1 Functional requirements

- FR1: Build `displayMessages` from raw `messages` in `ActiveThreadProvider`.
- FR2: Append one synthetic assistant shell when all are true:
  - thread `liveStatus` is `pending` **or** `streaming`
  - raw `messages` has at least 1 item
  - last raw message role is `user`
- FR3: Shell must be created by `createOptimisticStepStartMessage(shellId)`.
- FR4: Shell id must be deterministic/stable per expected reply turn.
- FR5: Expose `displayMessages` through `ActiveThreadMessagesContext` (`messages` field), not raw list.

## 6.2 Non-functional requirements

- NFR1: No `useEffect` for shell generation.
- NFR2: No writes to cache/store for synthetic shell.
- NFR3: Return original `messages` reference when no shell needed.
- NFR4: Keep additional logic in a single `useMemo` block.

---

## 7) Considered Solutions

### A) Add assistant optimistic patch in `useMessages`

- Pros: shell exists in merged data layer.
- Cons: temp ID replacement hard, manual revert complexity, cache pollution risk, duplicate risk.
- Verdict: reject (too complex for problem).

### B) Client-generated authoritative assistant ID + server reuse

- Pros: clean id replacement semantics.
- Cons: contract change (`chat.contract`, transport, handler), larger blast radius.
- Verdict: reject for this task (not minimal).

### C) Convex paginated optimistic insert

- Pros: data-layer persistence feel.
- Cons: heavy for small UX gap, still id reconciliation and pagination edge cases.
- Verdict: reject.

### D) Derived UI/view-model shell on top of raw messages (chosen)

- Pros: tiny diff, sync render, no id reconciliation in persistence layer, easy rollback.
- Cons: shell not persisted as data record (render-only).
- Verdict: accept.

---

## 8) Selected Solution Design

Create `displayMessages` in `apps/web/src/hooks/use-chat-active.tsx`:

1. Read raw `messages` from `useMessages(...)` (existing).
2. Compute `isOngoing = liveStatus === "pending" || liveStatus === "streaming"`.
3. Read last raw message.
4. If not ongoing OR no last OR last role != `user` => return raw `messages`.
5. Build deterministic shell id from thread + last user message id.
6. Create shell via `createOptimisticStepStartMessage(shellId)`.
7. Return `[...messages, shell]`.

Then wire `messagesState.messages = displayMessages`.

No other files required.

---

## 9) Deterministic Shell ID Strategy

Use:

`assistant-shell:${threadUuid}:${lastUserMessageId}`

Why:

- stable while waiting for that specific assistant turn
- changes automatically when next user message changes
- avoids remount jitter from random IDs

---

## 10) Implementation Steps (Exact)

1. Edit `apps/web/src/hooks/use-chat-active.tsx`.
2. Add import:
   - `createOptimisticStepStartMessage` from `@ai-monorepo/ai/helpers`.
3. Add `displayMessages` `useMemo` near existing status-derived memos.
4. Update `messagesState` memo to expose `displayMessages`.
5. Keep all send/regenerate logic unchanged.
6. Keep context types unchanged (`messages: MyUIMessage[]` still valid).

---

## 11) Code Example (Target Shape)

```tsx
import { createOptimisticStepStartMessage } from "@ai-monorepo/ai/helpers";

const displayMessages = useMemo(() => {
  const isOngoing =
    thread?.liveStatus === "pending" || thread?.liveStatus === "streaming";

  const last = messages.at(-1);
  if (!isOngoing) return messages;
  if (!last) return messages;
  if (last.role !== "user") return messages;

  const shellId = `assistant-shell:${chatNav.id}:${last.id}`;
  const shell = createOptimisticStepStartMessage(shellId);

  return [...messages, shell];
}, [messages, thread?.liveStatus, chatNav.id]);

const messagesState = useMemo(
  () => ({
    messages: displayMessages,
    isPending,
    isStale,
  }),
  [displayMessages, isPending, isStale]
);
```

Note:

- Keep helper-produced shell content as-is; do not custom craft shell object.
- If lint asks stronger typing, cast only where strictly needed.

---

## 12) Edge Cases

1. **First token arrives**

   - last raw message becomes assistant => synthetic shell auto disappears.

2. **Error/cancel**

   - thread no longer ongoing => synthetic shell removed.

3. **Regenerate**

   - regenerate path already re-anchors to user; same rule works.

4. **Refresh mid-pending**

   - recomputed from raw state (`thread.liveStatus` + last raw user).

5. **Thread switch**
   - shell id includes thread uuid; no cross-thread collision.

---

## 13) Acceptance Criteria

- AC1: After send, UI never ends on user message only while thread ongoing.
- AC2: At most one synthetic shell rendered.
- AC3: No synthetic shell once real assistant message is last.
- AC4: No `useMessages` behavior/caching changes.
- AC5: No `useEffect` introduced for shell.

---

## 14) Manual Verification Checklist

1. Send normal message:
   - immediate assistant shell appears.
2. Wait stream start:
   - shell replaced by real assistant stream, no duplicate.
3. Trigger error path:
   - shell disappears when status settles to error.
4. Refresh during pending:
   - shell reappears correctly.
5. Regenerate:
   - shell appears again while waiting.

---

## 15) Risks + Mitigations

- Risk: shell shows during rare stale `streaming` with no assistant yet.

  - Mitigation: acceptable; desired UX is "expecting assistant" signal.

- Risk: extra array allocation each render.
  - Mitigation: allocate only when shell appended; return same `messages` reference otherwise.

---

## 16) Rollback Plan

- Revert only `displayMessages` memo and `messagesState.messages` wiring in `use-chat-active.tsx`.
- System returns to current behavior immediately.

---

## 17) External References (Verified)

- AI SDK status semantics and loading behavior:
  - https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot
  - https://sdk.vercel.ai/docs/troubleshooting/streaming-status-delay
  - https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol
- Convex optimistic updates:
  - https://docs.convex.dev/client/react/optimistic-updates

---

## 18) Confidence Register

- Chosen solution fitness in this codebase: 98%
- Minimal-diff claim: 97%
- No-delay requirement satisfaction (sync render, no effect): 99%

---

## Unresolved Questions

- none
