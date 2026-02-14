# PRD v2 (Erratum): Last Assistant Min-Height Reserve

## Status

- This PRD **supersedes**: `.llms/plan/ui-last-assistant-min-height/0-prd-last-assistant-min-height.md`
- Reason: v1 misses a real CLS edge case on refresh + stream resume + settle.

---

## 1) Context (Standalone)

Conversation is ordered message rows (`user`, `assistant`).

Assistant states:

- unsettled: `pending`, `streaming`
- settled: `completed`, `error`, `cancelled`

Goal:

- reserve viewport space on last assistant row via `min-height`
- show reserve immediately (first paint), no delayed effect toggle
- keep reserve after settle (no collapse)
- remove reserve only when row no longer last (structural CSS targeting)

Fixed reserve value (locked decision):

- `min-h-[calc(100vh-20rem)]`

Known architecture constraint:

- assistant ids are unstable across optimistic shell -> server message replacement
- id-based latch is invalid

---

## 2) Erratum (Why v1 is wrong)

v1 rule:

```ts
shouldReserveLastAssistantSpace = hasSubmittedInActiveThread || !isThreadSettled;
```

Failing sequence:

1. User refreshes while thread is streaming.
2. App first paint: `!isThreadSettled === true` => reserve ON (correct).
3. Stream resumes and ends.
4. `isThreadSettled === true`, `hasSubmittedInActiveThread === false` (fresh load).
5. Reserve flips OFF => visible collapse (CLS).

Conclusion:

- `hasSubmittedInActiveThread` in hook is insufficient memory after refresh.
- Need UI-local latch that can be seeded by unsettled state on first paint, then kept for current thread session.

---

## 3) Product Requirements (v2)

### Functional

1. Reserve applies only to assistant rows.
2. Reserve class only activates on last row (`last:` targeting).
3. Reserve must turn ON when thread is unsettled.
4. Once ON in current thread session, reserve must stay ON after settle.
5. Reserve OFF behavior happens only by structural targeting when row is no longer last.

### Rendering / Stability

1. No `useEffect` / `useLayoutEffect` for reserve timing.
2. First paint must already be correct after refresh.
3. No one-frame class pop-in/pop-out.

### Scope / Architecture

1. Keep core business hook lean (`use-chat-active`).
2. Keep reserve-latch as UI concern in conversation L3.
3. Avoid feature creep in shared hook state.

---

## 4) Final Solution

## 4.1 Source-of-truth inputs

From `useActiveThreadState` keep only:

- `uuid`
- `isThreadSettled`

No submit-memory fields in hook.

## 4.2 Latch location

Implement latch in conversation UI layer (L3), not in hook.

Recommended placement:

- `apps/web/src/components/chat/conversation/conversation-layout.tsx`

Rationale:

- purely visual behavior
- avoids polluting hook/business contracts

## 4.3 Reset strategy by thread

Use keyed remount by thread id so latch is thread-session local:

```tsx
// conversation.tsx
<ChatConversationLayout key={uuid} threadUuid={uuid} ... />
```

This guarantees latch reset when thread changes.

## 4.4 Latch algorithm (no effects)

```tsx
// conversation-layout.tsx
const shouldSeedReserveLatch = !isThreadSettled;

const [hasReserveLatchInThreadSession, setHasReserveLatchInThreadSession] =
  useState<boolean>(shouldSeedReserveLatch);

if (!hasReserveLatchInThreadSession && shouldSeedReserveLatch) {
  setHasReserveLatchInThreadSession(true);
}

const shouldReserveLastAssistantSpace =
  shouldSeedReserveLatch || hasReserveLatchInThreadSession;
```

Notes:

- guarded render-phase state sync is intentional (no infinite loop)
- this is required to avoid effect-late timing

## 4.5 CSS targeting

Keep simple assistant row class gate:

```tsx
className={cn(
  isAssistant &&
    shouldReserveLastAssistantSpace &&
    "last:min-h-[calc(100vh-20rem)]"
)}
```

Do not use `nth-last-2`.

---

## 5) Migration from v1 (mandatory)

## 5.1 Remove v1 hook feature-creep

File: `apps/web/src/hooks/use-chat-active.tsx`

Remove:

- `hasSubmittedInActiveThread` from `ActiveThreadState` + context pick type
- `lastSubmittedThreadUuid` local state
- `setLastSubmittedThreadUuid(chatNav.id)` in `sendMessage`
- any memo deps tied to those fields

Keep:

- `isThreadSettled`

## 5.2 Update conversation state usage

File: `apps/web/src/components/chat/conversation/conversation.tsx`

- stop reading `hasSubmittedInActiveThread`
- pass `isThreadSettled` into layout
- key layout by `uuid`

Target shape:

```tsx
const { uuid, isThreadSettled } = useActiveThreadState();

<ChatConversationLayout
  key={uuid}
  isPending={isPending}
  isThreadSettled={isThreadSettled}
  messages={messages}
  threadUuid={uuid}
/>
```

## 5.3 Move reserve boolean computation into layout

File: `apps/web/src/components/chat/conversation/conversation-layout.tsx`

- add prop: `isThreadSettled: boolean`
- add local latch state + derived `shouldReserveLastAssistantSpace`
- keep passing boolean to `ConversationMessagesList`

## 5.4 Keep messages list simple

File: `apps/web/src/components/chat/conversation/_parts/messages-list.tsx`

- no algorithm changes, only class gate input from layout

---

## 6) Rejected Alternatives (v2)

1. Keep submit-memory in `use-chat-active`
   - rejected: UI concern leaking into business hook; still fails refresh-settle edge unless more hook complexity added.
2. ID-based latch
   - rejected: assistant id instability.
3. Effect-based latch (`useEffect`/`useLayoutEffect`)
   - rejected: can introduce frame-late class update.
4. `nth-last-2` structural utility
   - rejected: brittle target (second-from-end, not semantic last assistant).

---

## 7) Acceptance Criteria

1. Submit in settled thread -> reserve appears immediately on last assistant row.
2. Pending/streaming -> reserve present.
3. Settle after same turn -> reserve remains (no collapse).
4. **Refresh while streaming, then stream settles -> reserve remains (no CLS).**
5. New message turn makes prior assistant non-last -> prior row reserve gone in same render via `last:`.
6. Reserve never applies to user row.
7. Thread switch resets latch behavior for new thread session.

---

## 8) QA Matrix

- settled -> submit -> pending -> streaming -> completed
- settled -> submit -> pending -> error
- settled -> submit -> pending -> cancelled
- refresh during streaming -> resume -> completed (verify no collapse)
- refresh during pending -> resume -> completed (verify no collapse)
- multi-turn same thread (3+ turns)
- thread switch A->B and B->A (verify per-thread-session reset)
- mobile + desktop viewport with `min-h-[calc(100vh-20rem)]`

---

## 9) Non-Goals

- No scroll-to-bottom behavior redesign
- No backend status protocol changes
- No optimistic id reconciliation changes
- No list virtualization work

---

## 10) Implementation Checklist

1. Remove v1 submit-memory fields from `use-chat-active`.
2. Add `isThreadSettled` prop to `ChatConversationLayout`.
3. Key layout by `uuid` in `conversation.tsx`.
4. Implement local reserve latch in layout (render-phase guarded sync).
5. Keep list class gate unchanged except receiving computed boolean.
6. Run manual QA matrix above.

---

## 11) Decision Log

- We keep `isThreadSettled` as canonical thread-progress source.
- We remove `hasSubmittedInActiveThread` + `lastSubmittedThreadUuid` from hook.
- Reserve memory lives in conversation UI layer only.
- `last:min-h-[calc(100vh-20rem)]` stays fixed.
