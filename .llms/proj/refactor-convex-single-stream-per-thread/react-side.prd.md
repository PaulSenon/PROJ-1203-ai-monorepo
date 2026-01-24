# React-side PRD: Unified UIMessage Assembly v2

## Context
Phase 1 backend done (single stream per thread). React merge logic still MVP: tight coupling, flicker, wrong source, cache not first-class. Need deterministic assembly + ownership gating.

## Goals
- Deterministic UIMessage list from 5 layers
- No flicker on refresh or stream finish
- TTFT via local HTTP stream
- Resumed stream only when needed
- Cache snapshot shown instantly
- Keep UIMessage shape and hook return shape
- Perf: O(n) merges, single final sort

## Non-goals
- Schema changes
- SDK resumable stream
- Virtualized list/pagination changes
- Tests in this phase
- UI changes

## Definitions
- Layer priority low -> high: cache snapshot, persisted, optimistic patches, convex resumed stream, HTTP stream
- liveStatus kind: ongoing = pending|streaming; settled = completed|error|cancelled|undefined
- local owner: tab that started HTTP stream
- dataSource label: optional debug flag on metadata.dataSource; keep if already set

## Data sources
- Cache snapshot via useUserCacheEntryOnce (read once, no reactive loop)
- Persisted via threadMessagesPaginated (normalize to oldest -> newest; reverse once in memo)
- Optimistic patches stored locally in hook
- Resumed stream via useStreamingUiMessage (single UIMessage array)
- HTTP stream via useChatContext().messages

## Ownership rules
- isLocalOwned init false; reset on threadId change
- set true immediately before sdkSendMessage or sdkRegenerate
- set false on SDK error (catch + useChatContext onError)
- set false when liveStatus kind transitions ongoing -> settled (edge transition)
- no other source mutates ownership

## Resumed stream gating
Enable useStreamingUiMessage only when:
- isLocalOwned === false
- thread query not pending
- thread.liveStatus kind === ongoing
Else pass "skip".

## Merge algorithm (generic)
- Pre-normalize each layer once (memo): order oldest -> newest; persist layer reversed here
- Require normalize step per layer using a branded type to document intent:
  - type NormalizedMessages = MyUIMessage[] & { __normalized: true }
  - normalizeMessages(input, { reverse?: boolean }): NormalizedMessages
  - merge function only accepts NormalizedMessages
  - optional dev-only warning if input not sorted (cheap sample check)
- Inputs: ordered list of pre-normalized layers; each layer may optionally carry dataSource label
- Build list + id->index map from layer 0 (cache snapshot) in order
- For each later layer:
  - for each msg: if dataSource label provided and differs, shallow clone + set metadata.dataSource; else reuse msg
  - if id exists, replace at index
  - else push to end and record index
- After all layers: filter lifecycleState deleted/archived
- Final sort once by metadata.createdAt asc (fallback Date.now)
- No intermediate sorts; no concat; minimize clones

## Cache semantics
- Read snapshot once; always include as lowest layer in merge
- Write cache on every merged list change (skip only when threadUuid is "skip")
- No gating by isStale/isPending for cache writes

## Hook/API changes
- Create useMessagesV2 in apps/web/src/hooks/use-messages-v2.tsx (no edits to use-messages.tsx)
- useMessagesV2 inputs: threadUuid, resumeStreamEnabled boolean (derived in use-chat-active), optional threadId for cache key
- Outputs: same shape as current useMessages; isStreaming to be removed or redefined after usage audit
- use-chat-active.tsx switches to useMessagesV2, computes resumeStreamEnabled, owns isStreaming via thread liveStatus
- Extract ownership logic into useStreamOwnership (required)

## Pending/stale flags
- isPending: cache.isPending (false once snapshot ready)
- isQueryPending: persisted.isPending || resumed.isPending
- isStale: !cache.isPending && isQueryPending
- isLoading: persisted.isLoading
- isStreaming: audit usages; remove or redefine; prefer thread liveStatus in use-chat-active

## Implementation steps
1) Add useMessagesV2 with generic merge helper, cache snapshot inclusion, cache write effect.
2) Keep optimistic patch map; include patches as priority layer.
3) Add useStreamOwnership hook in use-chat-active.tsx: reset on thread change; set true before send/regenerate; clear on SDK error and ongoing->settled transition.
4) Add onError handler in useChatContext usage to clear ownership.
5) Compute resumeStreamEnabled in use-chat-active.tsx: !isLocalOwned && !isThreadPending && liveStatus kind ongoing.
6) Gate resumed stream in useMessagesV2 using resumeStreamEnabled.
7) Audit isStreaming usages and decide remove/replace; update components accordingly.

## Manual verification
- Refresh mid-stream: cached list shows instantly, resumed stream continues only if not owner
- Local send: HTTP stream shows, resumed stream skipped, no flicker at finish
- Multi-tab race: losing tab clears ownership on error and uses resumed stream
- Regenerate: same ownership + cache behavior
- Thread switch: ownership resets; no cross-thread stream

## Open questions
- none
