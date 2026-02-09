# PRD: Last Assistant Message Min-Height Reserve

## 1) Context

Chat conversation renders ordered messages (`user` + `assistant`).

Assistant message lifecycle:

- unsettled: `pending`, `streaming`
- settled: `completed`, `error`, `cancelled`

UX goal is strict scroll stability during submit + stream:

- when last message is assistant and response flow is active, reserve viewport space with min-height on that last assistant row
- keep reserve even when assistant transitions to settled
- remove reserve only when that message is no longer last
- must be correct on first paint (including refresh), no effect-late toggling, no jump/CLS

Important architecture constraint from current codebase:

- assistant message id is not stable during optimistic shell -> server message replacement
- id-based visual latching is not reliable

Target scope only:

- `apps/web/src/components/chat/conversation/`
- optional minimal state exposure in `apps/web/src/hooks/use-chat-active.tsx`

Out of scope:

- scroll-to-bottom logic itself
- backend stream protocol changes
- optimistic shell/id reconciliation changes

---

## 2) Problem Statement

Need deterministic, minimal implementation for last assistant min-height reserve that:

1. avoids effect-driven delayed class changes,
2. survives id replacement,
3. applies on first render after refresh if thread is ongoing,
4. keeps reserve after settle until a new message becomes last,
5. keeps code simple and low-risk.

---

## 3) User Stories

1. As a user, when I submit a prompt, I see assistant completion in a stable viewport with no sudden jump.
2. As a user, while assistant is pending/streaming, bottom reserve exists immediately.
3. As a user, when assistant finishes, viewport does not suddenly collapse.
4. As a user, when I send next message, previous assistant reserve disappears as part of same render that adds new messages.
5. As a user, if I refresh mid-stream, reserve is present on first paint.
6. As a user, if I refresh after thread settles, reserve is absent on first paint.

---

## 4) Requirements

### Functional

- Min-height applies only to assistant message row.
- Min-height applies only to the last rendered assistant row.
- Reserve-enable rule must be true when either:
  - user has submitted at least once since current thread load, or
  - current thread is not settled.
- Reserve remains after settle (same thread session) because submit flag stays true.
- Reserve disappears when message is no longer last (CSS structural targeting).

### Rendering/Timing

- No `useEffect`/`useLayoutEffect` for class toggle timing.
- Class decision is render-time only.
- Correct on first paint.

### Simplicity

- Minimal new state.
- Prefer CSS structural targeting over per-message computed flags.
- No new global state managers.

---

## 5) Explored Options

### Option A - Message ID latch (rejected)

Idea:

- latch message id when last assistant enters unsettled
- keep class if same id settles
- clear when id no longer last

Rejected because:

- optimistic shell id and server id differ
- latch breaks on id swap
- needs extra reconciliation complexity, against simplicity goal

### Option B - Pure CSS history-based latch (rejected)

Idea:

- rely on CSS only to keep style after state transitions

Rejected because:

- CSS cannot encode "was previously true" state without JS/state memory
- cannot implement semantic latch alone

### Option C - `nth-last-2` utility targeting (rejected)

Idea:

- add class like `nth-last-2:min-h-[...]` on assistant rows

Rejected because:

- targets second-from-end sibling, not semantic last message
- appears to work only if DOM has fixed trailing non-message node coupling
- brittle to structure changes

### Option D - Data attribute + CSS selector (accepted as viable fallback)

Idea:

- set container attr when reserve rule enabled
- target last assistant row via selector

Pros:

- explicit targeting
- decouples from utility variant assumptions

Cons:

- slightly more wiring than needed

### Option E - Submit/session flag + thread-settled flag + assistant `last:` utility (selected)

Idea:

- derive one boolean `shouldReserveLastAssistantSpace`
- apply assistant row class with `last:min-h-[calc(100vh-20rem)]`

Why selected:

- id-agnostic
- minimal state
- no effect
- first paint correct when flags computed at render
- easiest readable implementation

---

## 6) Final Solution Spec

### 6.1 State Contract

Expose from `useActiveThreadState()`:

- `hasSubmittedInActiveThread: boolean`
- `isThreadSettled: boolean`

Derived rule in conversation layer:

```ts
const shouldReserveLastAssistantSpace =
  hasSubmittedInActiveThread || !isThreadSettled;
```

### 6.2 How `hasSubmittedInActiveThread` is computed

Implementation invariant:

- set true at `sendMessage` action start in `use-chat-active` core flow
- reset on thread switch implicitly by comparing stored thread uuid to active `chatNav.id`

Recommended minimal shape:

```ts
const [lastSubmittedThreadUuid, setLastSubmittedThreadUuid] = useState<
  string | null
>(null);

// in sendMessage path, sync before async side effects
setLastSubmittedThreadUuid(chatNav.id);

const hasSubmittedInActiveThread = lastSubmittedThreadUuid === chatNav.id;
```

No effect reset required.

### 6.3 How `isThreadSettled` is computed

Thread `liveStatus` is canonical source of truth.

```ts
const isThreadSettled =
  thread?.liveStatus !== "pending" && thread?.liveStatus !== "streaming";
```

### 6.4 CSS targeting rule

Apply only on assistant message rows:

```tsx
className={cn(
  isAssistant && shouldReserveLastAssistantSpace && "last:min-h-[calc(100vh-20rem)]"
)}
```

This ensures min-height applies only when that row is the last child in list.

---

## 7) File-Level Changes

## 7.1 `apps/web/src/hooks/use-chat-active.tsx`

- Extend `ActiveThreadStateType` with:
  - `hasSubmittedInActiveThread`
  - `isThreadSettled`
- Add local state `lastSubmittedThreadUuid`.
- Set `lastSubmittedThreadUuid` in `sendMessage` flow at action start.
- Derive booleans and expose via provider state memo.

## 7.2 `apps/web/src/components/chat/conversation/conversation.tsx`

- Read both new state fields from `useActiveThreadState()`.
- Compute `shouldReserveLastAssistantSpace`.
- Pass boolean to messages list component.

## 7.3 `apps/web/src/components/chat/conversation/_parts/messages-list.tsx`

- Add prop `shouldReserveLastAssistantSpace: boolean`.
- In map, detect assistant role.
- Add assistant-only class with `last:min-h-[calc(100vh-20rem)]` gated by boolean.

No required change in message components.

---

## 8) Sample Integration Code

```tsx
// conversation.tsx
const { uuid, hasSubmittedInActiveThread, isThreadSettled } =
  useActiveThreadState();

const shouldReserveLastAssistantSpace =
  hasSubmittedInActiveThread || !isThreadSettled;

<ConversationMessagesList
  messages={messages}
  shouldReserveLastAssistantSpace={shouldReserveLastAssistantSpace}
/>;
```

```tsx
// messages-list.tsx
{
  messages.map((message) => {
    const isAssistant = message.role === "assistant";

    return (
      <ChatMessage
        key={message.id}
        message={message}
        className={cn(
          isAssistant &&
            shouldReserveLastAssistantSpace &&
            "last:min-h-[calc(100vh-20rem)]"
        )}
      />
    );
  });
}
```

```ts
// use-chat-active.tsx (core concept)
const [lastSubmittedThreadUuid, setLastSubmittedThreadUuid] = useState<
  string | null
>(null);

const sendMessage = useCallback(
  (params: SendMessageParams) => {
    setLastSubmittedThreadUuid(chatNav.id);
    // existing send flow
  },
  [chatNav.id]
);

const hasSubmittedInActiveThread = lastSubmittedThreadUuid === chatNav.id;

const isThreadSettled =
  thread?.liveStatus !== "pending" && thread?.liveStatus !== "streaming";
```

---

## 9) Acceptance Criteria

1. On first submit in a thread, newly rendered assistant shell has reserve min-height on first render.
2. During `pending` and `streaming`, reserve is present.
3. On transition to `completed`/`error`/`cancelled`, reserve stays if message remains last.
4. On next user+assistant append, previous assistant no longer receives reserve in same render.
5. On refresh while thread ongoing, reserve present on first paint.
6. On refresh when thread settled and no submit in current load, reserve absent.
7. Reserve never applies to user row.
8. No visible CLS introduced by late class application.

---

## 10) QA Matrix

- Submit -> pending -> streaming -> completed
- Submit -> pending -> error
- Submit -> pending -> cancelled
- Multi-turn thread (at least 3 cycles)
- Refresh during pending
- Refresh during streaming
- Refresh after completion
- Thread switch A -> B -> A (submit state reset per active thread)
- Mobile + desktop viewport check for `calc(100vh-20rem)` reserve size

---

## 11) Risks / Guardrails

- `last:` utility assumes message rows are direct children of the list and no extra trailing child inside same container.
- If future list adds non-message trailing nodes, rule must migrate to explicit selector strategy (Option D).
- Keep rule scoped only to assistant rows.

---

## 12) Non-Goals

- No virtualized list handling in this PRD.
- No smoothing animation for reserve add/remove.
- No changes to scroll-to-bottom trigger logic.
- No changes to optimistic shell id strategy.

---

## 13) Rollout

1. Add state fields in `use-chat-active`.
2. Wire boolean in `conversation.tsx`.
3. Apply assistant `last:min-h` rule in messages list.
4. Manual QA matrix.
5. If future DOM structure changes, fallback to Option D selector strategy.

---

## 14) Decision Log

- Use thread status as canonical settled/ongoing source.
- Use submit-since-load as latch memory.
- Avoid id latch because ids unstable.
- Avoid `nth-last-2` due structural brittleness.
- Prefer simplest render-time boolean + assistant `last:` class.

---

## 15) Resolved Decisions (Review)

- `Conversation.List` is expected to stay stable after recent refactor; keep `last:` approach as baseline.
- Reserve height is locked to `min-h-[calc(100vh-20rem)]` (fixed value, no responsive tokenization in this scope).
