# Conversation Runtime Architecture

Status: draft architecture snapshot for chat message rendering/perf work.

Related:
- [UBIQUITOUS_LANGUAGE.md](/app/UBIQUITOUS_LANGUAGE.md)
- [GRILL_ME_MESSAGES.md](/app/GRILL_ME_MESSAGES.md)

## Goal

Make message rendering granular and stable:

- message list rerenders only when visible order changes
- message content rerenders only when that message `parts` changes
- message footer/metadata consumers rerender only when that message `metadata` changes
- hot/cold updates in same tick collapse into one notify wave
- resumed/http message reconstruction stays outside store

## Canonical names

- **Conversation Runtime**: React-land orchestration for one mounted conversation
- **Conversation Provider**: context boundary that exposes the view store
- **Source Adapter**: React hook binding that forwards source truth into reconciler
- **Conversation Reconciler**: pure TS merge engine, source-aware, private
- **Conversation View Store**: scoped `zustand/vanilla` store, merged UI state only
- **Source**: one upstream truth contributor
- **Cold Source**: infrequent full-snapshot source
- **Hot Source**: frequent singleton source for active streamed message
- **Dirty Id**: message id that must be re-evaluated on next flush
- **Flush**: one microtask-batched reconciliation pass
- **View Patch**: one merged update payload applied to the view store

## Box model

```txt
React land
┌──────────────────────────────────────────────────────────┐
│ Conversation Provider                                   │
│  - creates view store once                              │
│  - creates reconciler once                              │
│  - provides view store to components                    │
│                                                          │
│ Conversation Runtime                                    │
│  - reads hooks/props                                    │
│  - binds each source adapter                            │
│  - computes status snapshot                             │
│  - forwards updates to reconciler                       │
└──────────────────────┬───────────────────────────────────┘
                       │
Pure TS                ▼
┌──────────────────────────────────────────────────────────┐
│ Conversation Reconciler                                 │
│  - owns private source truth                            │
│  - knows precedence                                     │
│  - tracks dirty ids                                     │
│  - microtask-batches updates                            │
│  - computes one public patch                            │
└──────────────────────┬───────────────────────────────────┘
                       │
Pure TS                ▼
┌──────────────────────────────────────────────────────────┐
│ Conversation View Store                                 │
│  - orderedIds                                           │
│  - recordsById                                          │
│  - status                                               │
│  - selector subscriptions                               │
└──────────────────────────────────────────────────────────┘
```

## Ownership

### React land

Owns:

- `threadUuid`
- `resumeStreamEnabled`
- hook execution
- source binding lifecycle
- status derivation from hooks

Does not own:

- merge precedence
- message winner selection
- subscription state internals

### Conversation Reconciler

Owns:

- current truth for each source
- merge precedence
- dirty ids
- ordered-id invalidation
- microtask scheduling
- generation of one merged `ViewPatch`

Does not own:

- React hooks
- AI SDK chunk reconstruction
- component subscriptions

### Conversation View Store

Owns only UI-facing merged state.

Does not know:

- cache/persisted/http/resumed source names
- precedence
- chunk semantics

## Public UI-facing state

```ts
type MessageRecord = {
  id: string;
  role: "user" | "assistant";
  metadata?: MyUIMessageMetadata;
  parts?: MyUIMessage["parts"];
};

type ConversationStatus = {
  isPending: boolean;
  isLoading: boolean;
  isStale: boolean;
  paginatedStatus: unknown;
  streamingStatus: unknown;
};

type ConversationViewState = {
  orderedIds: string[];
  recordsById: Record<string, MessageRecord>;
  status: ConversationStatus;
};
```

## Recommended `ViewPatch`

`ViewPatch` should be sparse and reducer-friendly.

Goals:

- one flush => one patch => one store write
- patch only what changed
- keep `orderedIds`, `parts`, and `metadata` refs stable when unchanged
- avoid separate public stores for ids/metadata/parts

Recommended shape:

```ts
type ViewPatch = {
  orderedIds?: string[];
  recordUpdates?: Record<
    string,
    | {
        kind: "upsert";
        value: MessageRecord;
      }
    | {
        kind: "remove";
      }
  >;
  status?: ConversationStatus;
};
```

Why this shape:

- `orderedIds` replacement is explicit and rare
- per-id record updates are sparse
- `remove` avoids overloading `undefined`
- a `MessageRecord` can change only in `metadata`, only in `parts`, or in both
- selectors subscribe to sub-slices, so record object churn does not force unrelated rerenders

Reducer:

```ts
function reduceViewPatch(
  prev: ConversationViewState,
  patch: ViewPatch,
): ConversationViewState {
  let next = prev;

  if (patch.orderedIds && patch.orderedIds !== prev.orderedIds) {
    next = { ...next, orderedIds: patch.orderedIds };
  }

  if (patch.status && patch.status !== prev.status) {
    next = { ...next, status: patch.status };
  }

  if (patch.recordUpdates) {
    let recordsById = next.recordsById;
    let recordsChanged = false;

    for (const [id, update] of Object.entries(patch.recordUpdates)) {
      if (update.kind === "remove") {
        if (!(id in recordsById)) continue;
        if (!recordsChanged) {
          recordsById = { ...recordsById };
          recordsChanged = true;
        }
        delete recordsById[id];
        continue;
      }

      if (recordsById[id] === update.value) continue;
      if (!recordsChanged) {
        recordsById = { ...recordsById };
        recordsChanged = true;
      }
      recordsById[id] = update.value;
    }

    if (recordsChanged) {
      next = { ...next, recordsById };
    }
  }

  return next;
}
```

Patch emission rules:

```ts
// if no visible order change
patch.orderedIds = undefined;

// if only metadata changed for id=4
patch.recordUpdates["4"] = {
  kind: "upsert",
  value: {
    ...prevRecord4,
    metadata: nextMetadata,
    parts: prevRecord4.parts,
  },
};

// if only parts changed for id=4
patch.recordUpdates["4"] = {
  kind: "upsert",
  value: {
    ...prevRecord4,
    metadata: prevRecord4.metadata,
    parts: nextParts,
  },
};
```

## Private source model

```ts
type ColdSourceName = "cache" | "persisted";
type HotSourceName = "http" | "resumed";

type OptimisticPatchId = string;

type ReconcilerSources = {
  cold: {
    cache: Map<string, MyUIMessage>;
    persisted: Map<string, MyUIMessage>;
  };
  optimistic: Map<OptimisticPatchId, MyUIMessage[]>;
  hot: {
    http: MyUIMessage | null;
    resumed: MyUIMessage | null;
  };
};
```

## Precedence

Final visible winner for a message id:

```ts
winner(id) =
  hot.http?.id === id ? hot.http
  : hot.resumed?.id === id ? hot.resumed
  : latestOptimisticMessageFor(id)
  : cold.persisted.get(id)
  : cold.cache.get(id)
  : null;
```

Meaning:

- hot sources always win
- optimistic patches sit above cold sources
- persisted beats cache
- when hot disappears, winner naturally falls back to optimistic/persisted/cache

## Why optimistic is not a cold snapshot

Optimistic exists for instant submit feedback before `useChat` visibly catches up.

Desired behavior:

- user submits
- optimistic message shows immediately
- later `useChat` hot message appears and wins
- later persisted result appears and hot disappears
- final visible winner becomes persisted

That makes optimistic a private reconciler concern with imperative API, not a React snapshot source.

Recommended API:

```ts
type ConversationReconciler = {
  replaceColdSource(source: ColdSourceName, messages: MyUIMessage[]): void;
  replaceHotSource(source: HotSourceName, message: MyUIMessage | null): void;
  replaceStatus(status: ConversationStatus): void;

  applyOptimisticPatch(messages: MyUIMessage[] | MyUIMessage): OptimisticPatchId;
  revertOptimisticPatch(patchId: OptimisticPatchId): void;

  destroy(): void;
};
```

Optimistic precedence rule:

```txt
hot > optimistic > persisted > cache
```

If multiple optimistic patches target same id, latest applied wins.

Optimistic usage scope for v1:

- immediate local submit feedback
- optional optimistic delete by overlaying `metadata.lifecycleState = "deleted"`

Important:

- optimistic delete should not require a separate API
- it is just another optimistic message overlay
- deleted/archived messages are filtered from final visible output during winner materialization

Filtering rule:

```ts
function isVisibleWinner(message: MyUIMessage | null) {
  if (!message) return false;
  const state = message.metadata?.lifecycleState;
  return state !== "deleted" && state !== "archived";
}
```

## Dirty ids

`DirtyId` means:

- this message id may have a different visible winner after recent source updates
- reconciler must re-check it on next flush
- it is not a guarantee the public record will change

Examples:

- persisted snapshot changed message `4` -> dirty `4`
- hot source switched from `assistant#4` to `null` -> dirty `4`
- optimistic patch reverted for message `u1` -> dirty `u1`

## Flush / batching

Rule:

- source updates never call store `setState` directly
- source updates only mutate private reconciler state + mark dirties
- reconciler schedules one microtask flush
- flush computes one `ViewPatch`
- flush applies max one store write

```ts
type DirtyState = {
  ids: Set<string>;
  orderedIds: boolean;
  status: boolean;
};

let flushScheduled = false;

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    flush();
  });
}
```

This gives:

- hot + cold updates in same tick => one notify wave
- metadata + parts + ids changes in same tick => one notify wave
- no extra store-level throttle beyond upstream throttles

## Full simplified flow

### 1. Provider + runtime

```tsx
function ConversationRuntimeProvider(props: {
  threadUuid: string;
  resumeStreamEnabled: boolean;
  children: React.ReactNode;
}) {
  const [viewStore] = useState(createConversationViewStore);
  const [reconciler] = useState(() =>
    createConversationReconciler({
      applyPatch: (patch) => applyViewPatch(viewStore, patch),
    }),
  );

  const cache = useCacheMessages(props.threadUuid);
  const persisted = usePersistedMessages(props.threadUuid);
  const resumed = useResumedMessage(
    props.resumeStreamEnabled ? props.threadUuid : "skip",
  );
  const http = useHttpActiveAssistantMessage();

  const status = useMemo<ConversationStatus>(
    () => ({
      isPending: computeIsPending({ cache, persisted, resumed }),
      isLoading: persisted.isLoading,
      isStale: computeIsStale({ cache, persisted, resumed }),
      paginatedStatus: persisted.status,
      streamingStatus: http.status,
    }),
    [cache, persisted, resumed, http.status],
  );

  useEffect(() => {
    reconciler.replaceColdSource("cache", cache.messages);
  }, [reconciler, cache.messages]);

  useEffect(() => {
    reconciler.replaceColdSource("persisted", persisted.messages);
  }, [reconciler, persisted.messages]);

  useEffect(() => {
    reconciler.replaceHotSource(
      "resumed",
      props.resumeStreamEnabled ? resumed.message : null,
    );
  }, [reconciler, props.resumeStreamEnabled, resumed.message]);

  useEffect(() => {
    reconciler.replaceHotSource("http", http.message);
  }, [reconciler, http.message]);

  useEffect(() => {
    reconciler.replaceStatus(status);
  }, [reconciler, status]);

  useEffect(() => () => reconciler.destroy(), [reconciler]);

  return (
    <ConversationStoreContext.Provider value={viewStore}>
      {props.children}
    </ConversationStoreContext.Provider>
  );
}
```

## Provider placement

Important repo-specific constraint:

- provider lifetimes are centralized under `apps/web/src/components/providers`
- session-scoped state must be registered in `4-chat-session-scope.tsx`

Recommended placement:

```tsx
function ChatSessionScopeExternalProviders({
  children,
  sessionId,
}: {
  children: React.ReactNode;
} & ChatSessionScopeContext) {
  return (
    <ChatDraftProvider>
      <ModelSelectorProvider>
        <ChatInputProvider>
          <AiSdkChatProvider sessionId={sessionId}>
            <ConversationRuntimeProvider threadUuid={sessionId}>
              <ActiveThreadProvider>{children}</ActiveThreadProvider>
            </ConversationRuntimeProvider>
          </AiSdkChatProvider>
        </ChatInputProvider>
      </ModelSelectorProvider>
    </ChatDraftProvider>
  );
}
```

Why this order:

- `AiSdkChatProvider` must be above runtime because runtime consumes SDK stream state
- runtime must be session-scoped so it fully resets on `sessionId` change
- `ActiveThreadProvider` can then consume conversation selectors instead of owning merge logic

### 2. Reconciler internals

```ts
function createConversationReconciler(deps: {
  applyPatch: (patch: ViewPatch) => void;
}): ConversationReconciler {
  const state = {
    sources: {
      cold: {
        cache: new Map<string, MyUIMessage>(),
        persisted: new Map<string, MyUIMessage>(),
      },
      optimistic: new Map<OptimisticPatchId, MyUIMessage[]>(),
      hot: {
        http: null as MyUIMessage | null,
        resumed: null as MyUIMessage | null,
      },
    },
    status: EMPTY_STATUS as ConversationStatus,
    dirty: {
      ids: new Set<string>(),
      orderedIds: false,
      status: false,
    },
    flushScheduled: false,
  };

  function replaceColdSource(source: ColdSourceName, messages: MyUIMessage[]) {
    reconcileColdSource(state, source, messages);
    scheduleFlush(state, flush);
  }

  function replaceHotSource(source: HotSourceName, message: MyUIMessage | null) {
    reconcileHotSource(state, source, message);
    scheduleFlush(state, flush);
  }

  function replaceStatus(next: ConversationStatus) {
    if (state.status === next) return;
    state.status = next;
    state.dirty.status = true;
    scheduleFlush(state, flush);
  }

  function flush() {
    const patch = buildViewPatch(state);
    resetDirty(state);
    if (patch) deps.applyPatch(patch);
  }

  return {
    replaceColdSource,
    replaceHotSource,
    replaceStatus,
    applyOptimisticPatch: (messages) => applyOptimisticPatch(state, messages),
    revertOptimisticPatch: (patchId) => revertOptimisticPatch(state, patchId),
    destroy: () => destroyReconciler(state),
  };
}
```

### 3. View store

```ts
type ConversationViewStore = ReturnType<typeof createConversationViewStore>;

function createConversationViewStore() {
  return createStore<ConversationViewState>()(() => ({
    orderedIds: [],
    recordsById: {},
    status: EMPTY_STATUS,
  }));
}

function applyViewPatch(
  store: ConversationViewStore,
  patch: ViewPatch,
) {
  const prev = store.getState();
  const next = reduceViewPatch(prev, patch);
  if (next === prev) return;
  store.setState(next);
}
```

### 4. Selector hooks

```ts
function useConversationOrderedIds() {
  const store = useConversationViewStore();
  return useStore(store, (s) => s.orderedIds);
}

function useMessageRole(messageId: string) {
  const store = useConversationViewStore();
  return useStore(store, (s) => s.recordsById[messageId]?.role);
}

function useMessageParts(messageId: string) {
  const store = useConversationViewStore();
  return useStore(store, (s) => s.recordsById[messageId]?.parts ?? []);
}

function useMessageMetadata(messageId: string) {
  const store = useConversationViewStore();
  return useStore(store, (s) => s.recordsById[messageId]?.metadata);
}

function useConversationStatus() {
  const store = useConversationViewStore();
  return useStore(store, (s) => s.status);
}
```

### 5. Component consumption

```tsx
function MessagesList() {
  const messageIds = useConversationOrderedIds();
  return messageIds.map((id) => <MessageRow key={id} messageId={id} />);
}

function MessageRow({ messageId }: { messageId: string }) {
  const role = useMessageRole(messageId);
  return role === "assistant"
    ? <AssistantMessage messageId={messageId} />
    : <UserMessage messageId={messageId} />;
}

function AssistantMessage({ messageId }: { messageId: string }) {
  const parts = useMessageParts(messageId);
  const metadata = useMessageMetadata(messageId);

  return (
    <>
      <MessageContent parts={parts} />
      <MessageFooter metadata={metadata} />
    </>
  );
}
```

## Ref stability rules

Required behavior:

```ts
prev.orderedIds === next.orderedIds
// if no visible order change

prev.recordsById["1"] === next.recordsById["1"]
// if message 1 did not change

prev.recordsById["4"].metadata !== next.recordsById["4"].metadata
// if only metadata changed

prev.recordsById["4"].parts !== next.recordsById["4"].parts
// if only parts changed

prev.recordsById["4"].parts?.[0] === next.recordsById["4"].parts?.[0]
// unchanged old parts keep ref

prev.recordsById["4"].parts?.at(-1) !== next.recordsById["4"].parts?.at(-1)
// only active tail part may churn
```

## AI SDK boundary

The reconciler/store should not own chunk protocol semantics.

Keep these outside:

- `useChat` message reconstruction
- resumed stream chunk reconstruction via `readUIMessageStream` / existing helper

Reconciler input should be already reconstructed `MyUIMessage`.

## Open points

- exact optimistic API surface can still be refined, but it belongs in reconciler, not view store
- `shouldShowThinking` can remain derived in React for v1; later it can become a latched derived selector if needed
- exact file structure must match repo provider stack and `hooks/chat` conventions

## Recommended file structure

Do not place runtime/store/reconciler under `components/chat/conversation`.

Reason:

- repo already centralizes session-scoped providers in `components/providers`
- `apps/web/src/hooks/chat` already acts as the home for chat-scoped providers, bindings, and hooks
- runtime/store/reconciler are chat runtime concerns before they are presentation concerns

Recommended tree:

```txt
apps/web/src/hooks/chat/conversation/
  conversation-runtime-provider.tsx
  conversation-runtime.tsx
  use-conversation-selectors.ts
  use-conversation-messages.ts            # optional compatibility facade during migration

  _adapters/
    use-bind-cache-source.ts
    use-bind-persisted-source.ts
    use-bind-http-source.ts
    use-bind-resumed-source.ts
    use-bind-status-source.ts

  engine/
    conversation-reconciler.ts
    conversation-view-store.ts
    conversation-view-patch.ts
    conversation-types.ts
    conversation-precedence.ts
    conversation-visibility.ts
    optimistic-patches.ts
```

Naming notes:

- prefer `engine/` over `_core/`
- `conversation-runtime-provider.tsx` = session-scoped context/store owner
- `conversation-runtime.tsx` = hook orchestration/binding component
- `use-conversation-selectors.ts` = React hooks over view store
- `engine/*` = pure TS except `conversation-view-store.ts` which is vanilla Zustand

## Message-layer adaptation

L3 message hooks remain in component feature folders and adapt from runtime selectors.

Recommended direction:

```txt
apps/web/src/components/chat/message/_hooks/
  use-message-role.ts
  use-message-parts.ts
  use-message-metadata.ts
  use-message-actions.ts
  read-message-raw-text.ts
```

Important:

- `use-message-raw-text-reader.ts` should not remain a reactive hook
- it should become a snapshot helper, e.g. `read-message-raw-text.ts`
- if it needs current parts, call `viewStore.getState()` or receive `parts` explicitly

Example:

```ts
export function readMessageRawText(parts: MyUIMessage["parts"]) {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
}
```

Or snapshot-based:

```ts
export function makeReadMessageRawText(store: ConversationViewStore) {
  return (messageId: string) => {
    const parts = store.getState().recordsById[messageId]?.parts ?? [];
    return readMessageRawText(parts);
  };
}
```

## Practical migration target

Short-term:

- add `ConversationRuntimeProvider` under session scope
- keep `ActiveThreadProvider`
- replace `useMessages` internals first
- optionally keep `use-conversation-messages.ts` as temporary facade

Then:

- switch message components to `messageId` + selector hooks
- move raw-text reader to snapshot helper
- shrink `ActiveThreadProvider` responsibility to actions + aggregate thread state
