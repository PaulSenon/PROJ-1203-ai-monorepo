# PRD - Client-Side Message IDs + Optimistic Assistant Shell + Global Conversation Error

## Document Meta

- Status: ready-for-implementation
- Scope: `apps/web`, `packages/api`, `packages/backend`, `packages/ai`
- Priority: high
- Rollout: incremental, feature-flagged

---

## 0) Clarification (must align team)

Current message creation path is upsert semantics.

- `InternalUpsertMessageWithParts` reads by `(userId, threadId, uuid)` then `.unique()` in `packages/backend/convex/chat.ts:240`.
- `.unique()` throws only when result count is `> 1`.
- If exactly one row exists, function patches existing row in `packages/backend/convex/chat.ts:283`.

Conclusion:

- A UUID collision against one existing row does not throw by default.
- To guarantee true create semantics, create-path must explicitly throw on existing row.

---

## 1) Problem Statement

Need assistant optimistic shell to appear instantly in real merged message list, with no temp-id reconciliation hacks.

Also need reliable failure UX when submission fails before a message-level error can exist.

This requires:

1. client-side assistant UUID generation,
2. unified retry for user+assistant UUID collisions,
3. invisible one retry with stable UI,
4. persistent thread-level (conversation-level) error block for non-message failures.

---

## 2) Goals

1. On submit, optimistic patch includes both user message and assistant shell immediately.
2. Same assistant UUID is reused by stream + persistence on success.
3. UUID collision handling works for both user and assistant collisions with one strategy.
4. First retry is invisible (auto), user sees stable UI.
5. If retry still fails, show persistent conversation-level error block with retry action.
6. Error survives reload.

---

## 3) Non-Goals

- No thread UUID collision project.
- No broad refactor of all message actions.
- No synthetic-shell-only fallback in this PRD.
- No L1 registry changes.

---

## 4) Constraints and Invariants

1. `message.id` remains immutable logical identity once accepted by backend.
2. Create paths must never patch existing message with same UUID.
3. Update paths must not allow UUID rewrite.
4. UI must not briefly remove optimistic bubbles during auto retry.
5. Conversation-level error must include enough retry payload to survive reload.

---

## 5) Key Design Decisions

## 5.1 One retry strategy for both collision types

Use one strategy for user and assistant UUID collision:

- regenerate both UUIDs,
- resend same user prompt + selected model,
- keep one auto retry attempt.

Why this is valid:

- `upsertThreadWithNewMessagesAndReturnHistory` runs in one Convex mutation transaction.
- if it throws conflict, prior writes in that mutation do not commit (atomicity).
- therefore resend full prompt is safe and consistent for both user/assistant collision cases.

## 5.2 Error placement

Collision before message persistence cannot reliably attach to a message row.

So add thread-level error state and UI block rendered after messages.

## 5.3 Invisible retry stability

Do not remove optimistic patch between attempt 1 and attempt 2.

- update patch payload in place (new helper) and resend.
- no intermediate empty state.

---

## 6) Data Model Changes

## 6.1 New conversation error type

File: `packages/ai/src/types/uiMessage.ts`

Add new zod type for thread-level error.

```ts
ConversationError = {
  kind: "MESSAGE_UUID_CONFLICT" | "SUBMIT_FAILED" | "UNKNOWN_ERROR";
  message?: string;
  retry: {
    type: "resend";
    text: string;
    selectedModelId?: string;
  };
  createdAt: number;
}
```

Notes:

- Keep message-level `MessageError` unchanged for message errors.
- Thread error is distinct because failure may happen before any message is created.

## 6.2 Thread schema

File: `packages/backend/convex/schema.ts`

- Add optional `error` field to `threads` table using new validated type.

## 6.3 Thread mutations patch support

File: `packages/backend/convex/chat.ts`

- Extend `upsertThreadClient`, `upsertThread`, `updateThread`, and internal patch types to allow `error` patch.

---

## 7) API and Backend Changes

## 7.1 Contract

File: `packages/api/src/contracts/chat.contract.ts`

- Add `assistantMessageUuid?: string` to input.

## 7.2 API handler

File: `packages/api/src/handlers/chat.handler.ts`

Implementation:

1. `newMessageUuid = input.assistantMessageUuid ?? nanoid()`.
2. Keep `createOptimisticStepStartMessage(newMessageUuid)`.
3. Keep `generateMessageId: () => newMessageUuid`.
4. Catch Convex create conflicts and map to typed oRPC error:
   - code: `CONFLICT`
   - data.kind: `MESSAGE_UUID_CONFLICT`
   - include retry hint metadata.

## 7.3 Convex insert-only guard for create path

File: `packages/backend/convex/chat.ts`

### A. Extend InternalUpsertMessageWithParts

- Add option `onExisting?: "patch" | "throw"` default `"patch"`.
- If existing and mode `throw`, throw `ConvexError` payload with `code: "MESSAGE_UUID_CONFLICT"`.

### B. Use throw mode in creation flow

In `upsertThreadWithNewMessagesAndReturnHistory`, call internal upsert with `onExisting: "throw"` for request-created messages.

### C. UUID immutability on update

In `updateMessage`:

- load existing row by `messageId`,
- if `validUiMessage.id !== existing.uuid`, throw `MESSAGE_UUID_IMMUTABLE_VIOLATION`.

---

## 8) Frontend Behavior Changes

## 8.1 Transport metadata

File: `apps/web/src/lib/chat/OrpcChatTransport.ts`

- Extend metadata schema with `assistantMessageUuid`.
- forward in `chatRpc.chat` input.

## 8.2 use-chat-active send orchestration

File: `apps/web/src/hooks/use-chat-active.tsx`

### New internal send flow (submit)

1. Build user message (`userUuid`).
2. Build assistant shell UUID (`assistantUuid`).
3. Apply one optimistic patch containing `[userMessage, assistantShell]`.
4. Send with metadata including `assistantMessageUuid`.
5. On typed collision and `attempt === 1`:
   - regenerate both UUIDs,
   - update existing optimistic patch payload (do not remove patch),
   - resend once (invisible retry).
6. On typed collision and `attempt === 2`:
   - revert optimistic patch,
   - set thread error (`liveStatus: error`, `error.retry` payload with user prompt/model),
   - stop.
7. On success:
   - clear thread error,
   - normal cleanup.

### Required helper addition in use-messages

File: `apps/web/src/hooks/use-messages.tsx`

- Add `replaceOptimisticPatch(patchId, nextPatch)` API to update same patch slot.
- Keep ordering stable; avoid delete+readd cycle.

Rationale: needed for invisible retry without intermediate UI collapse.

## 8.3 Conversation-level error block UI

### A. State exposure

File: `apps/web/src/hooks/use-chat-active.tsx`

- include thread `error` in active thread state context.
- add action `retryFailedConversation()`:
  - reads `thread.error.retry` payload,
  - calls `sendMessage({ text, options: { selectedModelId } })`.

### B. Render block after messages

File: `apps/web/src/components/chat/conversation/conversation.tsx`

- render `ConversationErrorBlock` after `ConversationMessagesList` when thread error exists.

### C. New component

File: `apps/web/src/components/chat/conversation/_parts/conversation-error-block.tsx`

- compose from `StatusBlock` + `StatusActionList`.
- use same error-kind-to-copy pattern as message status error mapping.
- minimum actions:
  - `Retry` primary (calls `retryFailedConversation`).

---

## 9) Milestones

## M1 - Core delivery (mandatory)

Includes:

1. client assistant UUID contract+transport+handler wiring,
2. Convex create-path insert-only guard,
3. UUID immutability guard in update path,
4. optimistic patch with user+assistant shell,
5. invisible one retry in `use-chat-active`,
6. persistent thread-level error model and global conversation error block,
7. working `Retry` action from thread error payload.

Exit criteria:

- optimistic assistant shell instant,
- collision auto-retry happens once silently,
- if retry fails, global error block appears and survives reload,
- retry action resends prompt successfully.

## M2 - Hardening

Includes:

1. richer error copy/i18n for conversation error kinds,
2. metrics/logging counters for collisions and retry outcomes,
3. optional dedupe guard for pathological duplicate message rows.

---

## 10) Implementation Steps (junior-ready)

1. Add `ConversationError` type in `packages/ai/src/types/uiMessage.ts`.
2. Add optional `threads.error` field in `packages/backend/convex/schema.ts`.
3. Extend thread mutation patch validators (`upsertThreadClient`, `upsertThread`, `updateThread`) to include `error`.
4. Add `assistantMessageUuid` to chat contract.
5. Extend `OrpcChatTransport` metadata schema and forwarding.
6. In API handler, use provided assistant UUID and map Convex conflict to typed oRPC conflict error.
7. Add `onExisting` mode to `InternalUpsertMessageWithParts`.
8. Use `onExisting: "throw"` in `upsertThreadWithNewMessagesAndReturnHistory`.
9. Add UUID immutability guard in `updateMessage`.
10. Add `replaceOptimisticPatch` in `use-messages` API.
11. Refactor submit flow in `use-chat-active` to support attempt-based invisible retry and thread-error persistence.
12. Add state/action for conversation retry in `use-chat-active` contexts.
13. Add `ConversationErrorBlock` component and render it after message list.
14. Wire retry button to `retryFailedConversation()`.

---

## 11) Manual Test Checklist

1. Normal submit:
   - user+assistant optimistic appears immediately.
   - stream updates assistant in place.
2. Force assistant UUID collision:
   - first retry auto and invisible.
3. Force repeat collision:
   - global error block appears.
   - reload page: block still appears.
   - click Retry: prompt resubmits.
4. Force user UUID collision:
   - same flow as assistant collision.
5. Update message with mismatched uuid payload:
   - immutability error thrown.

---

## 12) Risks and Mitigations

1. Risk: UI flicker on retry due patch replacement.

   - Mitigation: update patch in place via `replaceOptimisticPatch`; do not clear list between attempts.

2. Risk: thread error not cleared on success.

   - Mitigation: clear `thread.error` at submit start and on successful finish.

3. Risk: duplicate logic between message error and conversation error mapping.
   - Mitigation: keep shared mapping helpers in one L3 utility file if duplication grows.

---

## 13) Rollback Plan

1. disable assistant UUID passthrough and fall back to server nanoid.
2. disable insert-only guard mode (`onExisting: patch`).
3. keep thread error schema field (non-breaking), but stop writing it.

---

## 14) References (verified)

- Convex `.unique()` behavior
  - https://docs.convex.dev/api/interfaces/server.Query#unique
- Convex OCC and atomicity
  - https://docs.convex.dev/database/advanced/occ
- AI SDK stream protocol
  - https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol
- oRPC error handling
  - https://orpc.unnoq.com/docs/error-handling
  - https://orpc.unnoq.com/docs/client/error-handling

---

## Confidence

- architecture fit: 96%
- retry semantics fit: 95%
- implementation clarity for junior dev: 97%

---

## Unresolved Questions

- none
