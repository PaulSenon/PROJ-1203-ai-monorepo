# Convex Agents Message Streaming Architecture Analysis

This document provides a deep dive into how the Convex Agents component handles message streaming and pagination, covering the three different ways of reading UIMessages from React.

## Overview

The system handles three distinct scenarios for reading messages:

1. **REST (no streaming)**: Simple paginated query over finalized messages
2. **Streaming initiated by this browser**: HTTP stream via `useChat`, with the rest coming from paginated results
3. **Streaming resumed**: Query-based streaming that fetches chunks of ongoing message streams via Convex queries

## Core Components

### 1. Data Structures

#### UIMessage
```typescript
type UIMessage = {
  id: string;
  key: string; // `${threadId}-${order}-${stepOrder}`
  order: number;
  stepOrder: number;
  status: UIStatus; // "streaming" | "pending" | "success" | "failed"
  role: "user" | "assistant" | "system";
  parts: UIMessage["parts"]; // Text, tool calls, reasoning, etc.
  text: string;
  _creationTime: number;
  agentName?: string;
  metadata?: unknown;
}
```

#### StreamMessage & StreamDelta
```typescript
type StreamMessage = {
  streamId: string;
  threadId: string;
  order: number;
  stepOrder: number;
  status: "streaming" | "finished" | "aborted";
  format: "UIMessageChunk" | "TextStreamPart";
  agentName?: string;
  metadata?: unknown;
}

type StreamDelta = {
  streamId: string;
  start: number; // cursor start position
  end: number;   // cursor end position
  parts: UIMessageChunk[] | TextStreamPart[];
}
```

**Stream Format Types** (both from AI SDK):

- **`UIMessageChunk`** (default, preferred):
  - Higher-level chunks representing incremental updates to a `UIMessage`
  - Used with AI SDK's `readUIMessageStream()` which automatically reconstructs complete `UIMessage` objects
  - More convenient - the AI SDK handles the reconstruction logic
  - Used by default in the Convex Agents component (see `client/index.ts:582`)

- **`TextStreamPart`** (lower-level, manual processing):
  - Lower-level raw streaming parts from `streamText()` (e.g., `text-delta`, `tool-input-start`, `tool-call`, etc.)
  - Requires manual processing via `deriveUIMessagesFromTextStreamParts()` to build `UIMessage` objects
  - More control but more complex - you handle the state machine yourself
  - Used for backward compatibility or when you need fine-grained control over the streaming process

**Why two formats?**
- `UIMessageChunk` is the modern, recommended approach - it's what `readUIMessageStream` expects
- `TextStreamPart` is the raw format from `streamText()` - useful if you're not using the AI SDK's UI message utilities

### 2. Convex-Side: Delta Ingestion

#### DeltaStreamer Class
The `DeltaStreamer` class handles saving streaming parts to the database:

```12:376:src/client/streaming.ts
export class DeltaStreamer<T> {
  streamId: string | undefined;
  public readonly config: {
    throttleMs: number;
    onAsyncAbort: (reason: string) => Promise<void>;
    compress: ((parts: T[]) => T[]) | null;
  };
  #nextParts: T[] = [];
  #latestWrite: number = 0;
  #ongoingWrite: Promise<void> | undefined;
  #cursor: number = 0;
  public abortController: AbortController;

  constructor(
    public readonly component: AgentComponent,
    public readonly ctx: MutationCtx,
    config: {
      throttleMs: number | undefined;
      onAsyncAbort: (reason: string) => Promise<void>;
      abortSignal: AbortSignal | undefined;
      compress: ((parts: T[]) => T[]) | null;
    },
    public readonly metadata: {
      threadId: string;
      userId?: string;
      order: number;
      stepOrder: number;
      agentName?: string;
      model?: string;
      provider?: string;
      providerOptions?: ProviderOptions;
      format: "UIMessageChunk" | "TextStreamPart" | undefined;
    },
  ) {
    // ... initialization
  }

  public async addParts(parts: T[]) {
    // Accumulates parts and throttles writes
  }

  async #sendDelta() {
    // Creates and saves delta batches to database
  }
}
```

**Key Features:**
- **Throttling**: Waits `throttleMs` (default 250ms) between writes
- **Compression**: Can compress parts (e.g., concatenate text deltas) to reduce database writes and bandwidth
- **Cursor tracking**: Maintains cursor position for resumable streaming
- **Batching**: Groups parts into deltas with start/end cursors

**Why Compression? Understanding the Flow**

The confusion is understandable! Here's how it actually works:

**The Flow:**
1. **Streaming**: Chunks arrive from LLM one-by-one (e.g., "H", "e", "l", "l", "o")
2. **Batching (Throttling)**: Chunks accumulate in `#nextParts` array for ~250ms
3. **Compression**: When writing, consecutive text-deltas with same ID are concatenated WITHIN the batch
4. **Delta Write**: One delta record is written with the compressed parts
5. **Repeat**: Process continues, writing deltas every 250ms

**Key Insight:**
- **Batching** = collecting chunks over time (throttling) before writing
- **Compression** = optimizing WITHIN each batch by concatenating consecutive text deltas

**Example Timeline:**

Without compression (within one 250ms batch):
```
Delta written at t=250ms contains:
  - { type: "text-delta", id: "text-1", delta: "H" }
  - { type: "text-delta", id: "text-1", delta: "e" }
  - { type: "text-delta", id: "text-1", delta: "l" }
  - { type: "text-delta", id: "text-1", delta: "l" }
  - { type: "text-delta", id: "text-1", delta: "o" }
```

With compression (within one 250ms batch):
```
Delta written at t=250ms contains:
  - { type: "text-delta", id: "text-1", delta: "Hello" }
```

**Why This Matters:**
- **Streaming is preserved**: Deltas are still written every 250ms, clients get incremental updates
- **Reduces parts per delta**: Instead of 5 parts, you get 1 part (same data, less overhead)
- **Database efficiency**: Each delta record has fewer parts to store/query
- **Bandwidth**: When clients fetch deltas, they get fewer parts to process

**The compression happens WITHIN each batch, not across the entire stream.** You still get streaming because deltas are written periodically, not all at once.

#### syncStreams Function

**WHERE**: Called inside Convex queries (server-side)  
**WHEN**: When you want to enable streaming support in your query  
**WHY**: Fetches streaming data (either stream metadata or delta chunks) for clients to consume

```48:81:src/client/streaming.ts
export async function syncStreams(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  component: AgentComponent,
  {
    threadId,
    streamArgs,
    includeStatuses,
  }: {
    threadId: string;
    streamArgs?: StreamArgs | undefined;
    // By default, only streaming messages are included.
    includeStatuses?: ("streaming" | "finished" | "aborted")[];
  },
): Promise<SyncStreamsReturnValue | undefined> {
  if (!streamArgs) return undefined;
  if (streamArgs.kind === "list") {
    return {
      kind: "list",
      messages: await listStreams(ctx, component, {
        threadId,
        startOrder: streamArgs.startOrder,
        includeStatuses,
      }),
    };
  } else {
    return {
      kind: "deltas",
      deltas: await ctx.runQuery(component.streams.listDeltas, {
        threadId,
        cursors: streamArgs.cursors,
      }),
    };
  }
}
```

**Two Modes:**

1. **`kind: "list"`** - Discover active streams
   - **When**: First time fetching streams, or when you need to know what streams exist
   - **Returns**: Array of `StreamMessage` objects (metadata about each stream)
   - **Used by**: `useDeltaStreams` hook to discover what streams are active
   - **Example**: "What streams are currently active for this thread?"

**Why We Need to List Streams (Why Not Just Use Messages Table?)**

This is a great question! Here's why streams are separate:

**The Timeline Problem:**
1. **Stream created** → `streamingMessages` record created immediately when streaming starts
2. **Deltas written** → `streamDeltas` records written as chunks arrive
3. **Message created** → `messages` record might be "pending" or might not exist yet
4. **Stream finishes** → Message finalized, stream deleted after cleanup delay

**Key Issues with Using Messages Table Only:**

1. **No Message Yet**: During active streaming, there might be NO message record at all, or only a "pending" placeholder. The stream exists and has deltas, but no finalized message.

2. **Need StreamId to Fetch Deltas**: Even if a message has `status: "pending"` or `status: "streaming"`, you need the `streamId` to query the `streamDeltas` table. Messages don't store `streamId` - they're linked by `(threadId, order, stepOrder)`.

3. **Multiple Streams Per Order**: The comment in schema says "There should only be one per order" but streams can be replaced. You need to query streams table to find the active one.

4. **Stream State vs Message State**: Streams have their own lifecycle (`streaming` → `finished` → deleted). Messages have different states (`pending` → `success`/`failed`). They're not always in sync.

5. **Resume After Interruption**: If a client disconnects and reconnects, they need to discover what streams exist to resume fetching deltas. The messages table might show "pending" but doesn't tell you the `streamId` to resume.

**The Relationship:**
```
Streaming starts
  ↓
streamingMessages record created (streamId: "abc123")
  ↓
Deltas written to streamDeltas table (streamId: "abc123")
  ↓
[Optional] messages record created with status: "pending" (no streamId field!)
  ↓
Streaming continues...
  ↓
Stream finishes → streamingMessages.state = "finished"
  ↓
Message finalized → messages.status = "success"
  ↓
[After 5 min] streamingMessages record deleted, streamDeltas vacuumed
```

**So Why List Streams?**
- To find active streams that might not have messages yet
- To get the `streamId` needed to fetch deltas
- To discover streams that are still streaming (even if message is "pending")
- To resume streams after client reconnection

**Could Messages Have streamId? Why Not Just Create Message with streamId When Streaming Starts?**

This is a valid question! Let's look at the actual timing:

**Current Flow:**
```
1. DeltaStreamer created → stream created (streamId: "abc123")
2. Streaming starts
3. First step finishes → [Optional] pending message created (NO streamId!)
4. More steps...
5. Stream finishes → message finalized
```

**Why Not Create Message with streamId at Step 1?**

There are several technical reasons:

1. **Order/stepOrder Not Known Yet**: When the stream is created, the final `order` and `stepOrder` might not be determined yet. They're calculated during the generation process. The stream is created with an initial `order` and `stepOrder`, but these might need adjustment based on what gets generated.

2. **One Stream = One UIMessage (But Multiple MessageDocs)**: Actually, you're right! With AI SDK, `toUIMessageStream()` produces **one UIMessage** per stream. That UIMessage contains all parts (text, tool calls, tool results) as parts of that single message. However, when converting to `MessageDoc` format for storage, one UIMessage can become multiple MessageDocs (see `fromUIMessages` which does `flatMap`). So the stream is tied to one UIMessage, but that UIMessage might be stored as multiple MessageDoc records. The schema comment about "tool call and tool result" refers to how the stream's `stepOrder` relates to the MessageDocs created from it, not that the stream produces multiple messages.

**Why MessageDoc Instead of UIMessage? (AI SDK Recommends UIMessage!)**

You're absolutely right to question this! AI SDK documentation clearly recommends storing `UIMessage` directly. However, this codebase uses `MessageDoc` instead for several reasons:

**MessageDoc stores:**
- `message: vMessage` - The raw ModelMessage format (what LLMs understand)
- Additional metadata: `userId`, `threadId`, `order`, `stepOrder`, `embeddingId`, `fileIds`, `error`, `status`, `agentName`, `model`, `provider`, `usage`, `providerMetadata`, `sources`, `warnings`, `finishReason`, `reasoning`, etc.
- Convenience fields: `text` (extracted), `tool` (boolean flag)

**UIMessage stores:**
- `parts: UIPart[]` - UI representation with structured parts
- Basic metadata: `id`, `role`, `key`, `order`, `stepOrder`, `status`, `text`, `_creationTime`, `agentName`, `metadata`

**Why the conversion?**
1. **LLM Context**: The system needs the raw `ModelMessage` format to pass to LLMs (via `convertToModelMessages`). Storing UIMessage would require conversion every time.
2. **Rich Metadata**: MessageDoc stores much more metadata (embeddings, file refs, usage stats, provider metadata) that UIMessage doesn't support.
3. **Database Queries**: MessageDoc format enables efficient queries (text search, vector search, filtering by tool, status, etc.) that would be harder with UIMessage's nested `parts` structure.
4. **Tool Call Separation**: One UIMessage (with tool calls + results as parts) becomes multiple MessageDocs (one per tool call/result) for better queryability and indexing.

**The Tradeoff:**
- ✅ Better for LLM context (already in ModelMessage format)
- ✅ Richer metadata storage
- ✅ Better database query performance
- ✅ Tool calls/results as separate records
- ❌ Goes against AI SDK recommendation
- ❌ Requires conversion layer (`toUIMessages` / `fromUIMessages`)
- ❌ More complex than storing UIMessage directly

**Could You Store UIMessage Instead?**
Yes! You could store UIMessage directly (as AI SDK recommends) and:
- Convert to ModelMessage when needed for LLM calls
- Store additional metadata in a separate table or as JSON
- Accept that tool calls/results are parts of one message, not separate records

The current design prioritizes LLM context efficiency and rich metadata over simplicity.

3. **Pending Messages Are Optional**: Pending messages are only created if `createPendingMessage` is true (determined by `willContinue()`). You can't rely on them always existing.

4. **Stream Created Before Any Steps**: The stream is created when `DeltaStreamer` is instantiated, which happens BEFORE any steps complete. The pending message is only created AFTER the first step finishes. So there's a timing gap.

5. **Stream Replacement Complexity**: If a stream is aborted and replaced, you'd need to:
   - Update the message's `streamId` (extra write)
   - Handle the case where the old streamId is still referenced
   - Clean up `streamId` when stream is deleted (5 min later)

6. **Query Performance**: Querying `messages` table with `status: "pending"` and `streamId: undefined` would be slower than querying the dedicated `streamingMessages` table with its optimized index.

**Could It Be Simpler?**

Yes, it could be simpler in some cases! You could:
- Add `streamId?: string` to messages schema
- Create message with `streamId` when stream starts (if order/stepOrder known)
- Query messages with `status: "pending" AND streamId IS NOT NULL`

**But the tradeoffs are:**
- Cleanup complexity (removing streamId when stream deleted after 5 min)
- Performance (messages table is larger, more indexes)
- Separation of concerns (temporary streaming data vs permanent history)
- Timing gap: stream created before pending message (if it's even created)

**Wait, What About Order/stepOrder Complexity?**

You're absolutely right! The order/stepOrder complexity is **NOT** about the stream itself - the stream from `streamText()` is already ordered! The complexity in this codebase comes from:

1. **Thread-level ordering**: They need to figure out what `order` number to assign to a NEW message in a thread (querying existing messages to find max order)
2. **MessageDoc splitting**: Because they split one UIMessage into multiple MessageDocs, they need `stepOrder` to track which MessageDoc comes from which part

**If you store UIMessage directly:**
- ✅ The stream is already ordered - just buffer chunks to one message entity
- ✅ UIMessage has an `id` - use that as the primary key
- ✅ No need for complex order/stepOrder logic for the stream itself
- ✅ You only need thread-level ordering if you want to sort messages in a conversation (which you can do by `_creationTime` or a simple sequence number)

So you're right - storing UIMessage directly eliminates most of this complexity! The order/stepOrder stuff is only needed because of the MessageDoc design choice.

**The Current Design Prioritizes:**
- Clean separation: streams = temporary, messages = permanent
- Performance: dedicated table with optimized indexes
- Flexibility: streams can exist without messages
- Simplicity: no cleanup needed (streams auto-delete)

So while your suggestion would work, the current design optimizes for performance, separation of concerns, and avoiding cleanup complexity at the cost of requiring a separate query.

2. **`kind: "deltas"`** - Fetch delta chunks
   - **When**: After discovering streams, to get the actual streaming data
   - **Returns**: Array of `StreamDelta` objects (the actual chunks/parts)
   - **Used by**: `useDeltaStreams` hook to fetch incremental updates
   - **Example**: "Give me all new deltas for stream X starting from cursor 42"

**How It's Used in Practice:**

**Step 1: Define a Query that calls `syncStreams`**

```typescript
// example/convex/chat/streaming.ts
export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs, // Required for streaming
  },
  handler: async (ctx, args) => {
    await authorizeThreadAccess(ctx, args.threadId);
    
    // Call syncStreams to get streaming data
    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs, // Pass through from query args
    });
    
    // Get paginated messages
    const paginated = await listUIMessages(ctx, components.agent, args);
    
    // Return both paginated messages AND streams
    return {
      ...paginated,
      streams, // This is what the React hooks consume
    };
  },
});
```

**Step 2: React Hooks Call Your Query**

The React hooks (`useUIMessages`, `useDeltaStreams`) automatically:
1. Call your query with `streamArgs: { kind: "list" }` to discover streams
2. Then call your query with `streamArgs: { kind: "deltas", cursors: [...] }` to fetch deltas
3. Your query passes these `streamArgs` to `syncStreams`, which does the actual work

**The Flow:**

```
React Hook (useDeltaStreams)
  ↓
  Calls your query with streamArgs: { kind: "list" }
    ↓
    Your query calls syncStreams(ctx, component, { streamArgs: { kind: "list" } })
      ↓
      Returns: { kind: "list", messages: [...] }
        ↓
        React hook discovers streams
          ↓
          Calls your query with streamArgs: { kind: "deltas", cursors: [...] }
            ↓
            Your query calls syncStreams(ctx, component, { streamArgs: { kind: "deltas", cursors: [...] } })
              ↓
              Returns: { kind: "deltas", deltas: [...] }
                ↓
                React hook processes deltas and updates UI
```

**Why This Design?**

- **Separation of concerns**: Your query handles auth, filtering, etc. `syncStreams` handles stream data
- **Flexibility**: You can modify/filter streams before returning them
- **Type safety**: The query signature enforces `streamArgs` when streaming is enabled
- **Reactive**: Convex queries automatically re-run when stream data changes

**Key Point**: You don't call `syncStreams` directly from React. You call your query, which internally calls `syncStreams`. The React hooks orchestrate the two-phase process (list → deltas) by calling your query with different `streamArgs`.

---

## Alternative Simpler Architecture (User's Proposal)

**Why Not Separate Endpoints?**

The current design uses a single endpoint that handles both paginated messages and streams via `syncStreams`. However, a simpler approach is possible:

**Proposed Architecture:**

1. **`listThreadMessages(threadId, paginationOpts)`** - Paginated query
   - Returns persisted UIMessages
   - Messages with `status: "pending"` or `status: "streaming"` include `streamId`
   - Can be used standalone (messages appear when fully done via reactive query)

2. **`getMessageStream(streamId)`** - Reactive query
   - Returns all chunks so far for a specific stream
   - Reactively updates as new chunks arrive
   - Returns chunks in order (already ordered from AI SDK)

**React Hook Flow:**

⚠️ **IMPORTANT: You cannot call hooks in a map/loop!** This violates the Rules of Hooks.

**Correct Approach: Single Query with Multiple StreamIds**

Instead of calling `useQuery` multiple times, use a single query that accepts multiple streamIds:

```typescript
function useMessages(threadId: string) {
  // 1. Load paginated messages
  const paginated = usePaginatedQuery(api.messages.listThreadMessages, { threadId });
  
  // 2. Find pending messages (they have streamId)
  const pendingMessages = useMemo(() => 
    paginated.results.filter(m => 
      m.status === "pending" || m.status === "streaming"
    ),
    [paginated.results]
  );
  
  // 3. Extract streamIds (not calling hooks in map!)
  const streamIds = useMemo(() => 
    pendingMessages.map(msg => msg.streamId).filter(Boolean),
    [pendingMessages]
  );
  
  // 4. Single query for all streams (not multiple hooks!)
  const streamData = useQuery(
    api.messages.getStreams, // Query that accepts multiple streamIds
    streamIds.length > 0 
      ? { streamIds } 
      : "skip" // Skip if no pending streams
  );
  
  // 5. Merge: Replace pending messages with streamed content
  const merged = useMemo(() => {
    if (!streamData) return paginated.results;
    
    // Create a map of streamId -> streamed message
    const streamMap = new Map(
      streamData.streams.map(stream => [stream.streamId, stream.message])
    );
    
    // Replace pending messages with streamed content
    return paginated.results.map(msg => {
      if (msg.status === "pending" || msg.status === "streaming") {
        const streamed = streamMap.get(msg.streamId);
        return streamed || msg;
      }
      return msg;
    });
  }, [paginated.results, streamData]);
  
  return merged;
}
```

**Backend Query Implementation:**

```typescript
// convex/messages.ts
export const getStreams = query({
  args: {
    streamIds: v.array(v.string()),
  },
  handler: async (ctx, { streamIds }) => {
    // Fetch all streams in parallel
    const streams = await Promise.all(
      streamIds.map(async (streamId) => {
        const deltas = await ctx.runQuery(api.messages.getStreamDeltas, { streamId });
        const message = await materializeMessageFromDeltas(deltas);
        return { streamId, message };
      })
    );
    
    return { streams };
  },
});
```

**Option 1: Use `useQueries` (Convex React Has It!)**

✅ **Convex React DOES have `useQueries`!** Here's how to use it:

```typescript
import { useQueries } from "convex/react";

function useMessages(threadId: string) {
  const paginated = usePaginatedQuery(api.messages.listThreadMessages, { threadId });
  
  const pendingMessages = useMemo(() => 
    paginated.results.filter(m => 
      m.status === "pending" || m.status === "streaming"
    ),
    [paginated.results]
  );
  
  const streamIds = useMemo(() => 
    pendingMessages.map(msg => msg.streamId).filter(Boolean),
    [pendingMessages]
  );
  
  // ✅ useQueries API: object with keys as identifiers
  const streamQueries = useQueries(
    useMemo(() => {
      // Build object dynamically: { [streamId]: { query, args } }
      const queries: Record<string, { query: any; args: any }> = {};
      streamIds.forEach(streamId => {
        queries[streamId] = {
          query: api.messages.getMessageStream,
          args: { streamId },
        };
      });
      return queries;
    }, [streamIds])
  );
  
  // Merge results
  const merged = useMemo(() => {
    const streamMap = new Map<string, UIMessage>();
    
    // streamQueries is an object: { [streamId]: result | undefined | Error }
    Object.entries(streamQueries).forEach(([streamId, result]) => {
      if (result && !(result instanceof Error)) {
        streamMap.set(streamId, result);
      }
    });
    
    return paginated.results.map(msg => {
      if (msg.status === "pending" || msg.status === "streaming") {
        const streamed = streamMap.get(msg.streamId);
        return streamed || msg;
      }
      return msg;
    });
  }, [paginated.results, streamQueries]);
  
  return merged;
}
```

**Convex `useQueries` API:**
```typescript
const results = useQueries({
  identifier1: {
    query: api.functions.myQuery,
    args: { param: "value" }
  },
  identifier2: {
    query: api.functions.anotherQuery,
    args: { id: 123 }
  }
});

// Returns: { identifier1: result | undefined | Error, identifier2: ... }
```

**Benefits of `useQueries`:**
- ✅ Clean API - designed for dynamic queries
- ✅ Each query is independent (can have different loading states)
- ✅ Returns `undefined` while loading, `Error` on failure
- ✅ Reactive: automatically updates when any query result changes
- ✅ Follows Rules of Hooks (single hook call, not in a loop)

**Option 2: Single Batched Query (If No `useQueries`)**

If Convex doesn't have `useQueries`, batch all streamIds into a single query:

```typescript
// Single query that handles multiple streams
const streamData = useQuery(
  api.messages.getStreamsBatch,
  pendingMessages.length > 0
    ? { 
        streamIds: pendingMessages.map(m => m.streamId).filter(Boolean)
      }
    : "skip"
);
```

**Benefits of Batched Query:**
- ✅ Single network request (more efficient)
- ✅ Simpler backend (one query handler)
- ✅ Atomic updates (all streams update together)
- ✅ Works with any React library (no `useQueries` needed)

**Tradeoffs:**

| Feature | `useQueries` | Batched Query |
|---------|-------------|---------------|
| Network requests | Multiple (one per stream) | Single |
| Backend complexity | Simple (per-stream query) | More complex (batch handler) |
| Error handling | Per-query | All-or-nothing |
| Loading states | Per-query | Single state |
| Reactivity | Independent | Atomic |
| Efficiency | Less efficient (many requests) | More efficient (one request) |

**Recommendation:**

✅ **Use `useQueries`** - Convex React has it! It's the cleanest approach for dynamic queries.

**When to use each:**

- **Use `useQueries`** (Recommended):
  - ✅ Convex React has it built-in
  - ✅ Clean API for dynamic queries
  - ✅ Per-stream loading/error states
  - ✅ Independent reactivity per stream
  - ✅ Follows Rules of Hooks properly

- **Use Batched Query** if:
  - You want maximum efficiency (single network request)
  - You prefer simpler backend code (one query handler)
  - All streams should update atomically
  - You have many streams (reduces network overhead)

**The Key Insight:**
Instead of:
```typescript
// ❌ ILLEGAL - Hooks in a loop
pendingMessages.map(msg => useQuery(..., { streamId: msg.streamId }))
```

Do:
```typescript
// ✅ Option 1: useQueries (RECOMMENDED - Convex has it!)
const queries = useMemo(() => {
  const obj: Record<string, { query: any; args: any }> = {};
  streamIds.forEach(id => {
    obj[id] = { query: api.messages.getMessageStream, args: { streamId: id } };
  });
  return obj;
}, [streamIds]);
const results = useQueries(queries);

// ✅ Option 2: Batched query (more efficient for many streams)
useQuery(api.messages.getStreamsBatch, { streamIds: [...all streamIds] })
```

**Note:** `useQueries` is available in Convex React! Use it for cleaner code. Batched query is more efficient if you have many streams (single request vs multiple).

**Backend Flow:**

1. **User submits message** → `useChat` sends to backend
2. **Backend**: 
   - Saves user message to DB
   - Creates empty assistant message with `status: "pending"` and `streamId`
   - Starts `streamText()` with history
3. **Client receives HTTP stream** via `useChat` (real-time for initiator)
4. **Client reloads mid-stream**:
   - Requests paginated messages → sees one `status: "pending"` with `streamId`
   - Queries `getMessageStream(streamId)` reactively
   - Replaces pending message with streamed content
5. **Stream ends**:
   - Backend deletes stream and chunks
   - Updates message: `status: "completed"`, full content persisted
6. **Client reactive query**:
   - Paginated query sees message updated (no longer pending)
   - Stream query skips (message no longer pending)
   - Uses paginated result (transparent to user)

**Benefits:**

- ✅ **Simpler**: No two-phase `list` → `deltas` dance
- ✅ **More intuitive**: Stream discovery happens naturally (check pending messages)
- ✅ **Per-message streams**: Each pending message gets its own reactive query
- ✅ **Clear separation**: Paginated messages vs stream chunks
- ✅ **Works standalone**: Paginated query alone provides reactive UI (messages appear when done)

**Handling useChat Streaming:**

When stream is initiated by client via `useChat`:
- Patch paginated result with `useChat` streaming message
- Skip stream query for that message (you already have it from HTTP stream)
- Same merge logic works for both sources (HTTP stream or reactive query)

**The Merge Logic:**

```typescript
function mergeMessages(
  paginated: UIMessage[],
  streamQueries: UIMessage[][],
  useChatMessage?: UIMessage
) {
  const messageMap = new Map<string, UIMessage>();
  
  // Add paginated messages
  paginated.forEach(msg => {
    messageMap.set(msg.id, msg);
  });
  
  // Replace with streamed content (if streaming)
  streamQueries.forEach(streamed => {
    streamed.forEach(msg => {
      if (msg.status === "streaming" || msg.status === "pending") {
        messageMap.set(msg.id, msg);
      }
    });
  });
  
  // useChat message takes precedence (if provided)
  if (useChatMessage) {
    messageMap.set(useChatMessage.id, useChatMessage);
  }
  
  return sorted(Array.from(messageMap.values()));
}
```

**Is This Missing Something?**

Your approach is actually cleaner! The only consideration:

- **Multiple pending messages**: Your approach handles this naturally - each gets its own reactive query
- **Stream ID in message**: Yes, store `streamId` in the message when creating it
- **Cleanup**: When stream ends, delete stream/chunks and update message status
- **useChat merge**: Same merge logic works for both sources

The current `syncStreams` design is more complex because it tries to batch stream discovery and delta fetching. Your approach is simpler and more intuitive!

---

## Performance Optimization for High-Frequency Updates

**The Problem:**
- `useChat` can send many chunks per second (potentially 10-50+ chunks/sec)
- Each chunk triggers a rerender → merge operation
- This can cause performance issues

**Optimization Strategies:**

### 1. Ref-Based Map with Incremental Updates (Recommended)

Use refs to maintain a stable message map, only update state when needed:

```typescript
function useOptimizedMessages(
  paginated: UIMessage[],
  streamQueries: Map<string, UIMessage>,
  useChatMessage?: UIMessage
) {
  // Stable ref map - doesn't trigger rerenders
  const messageMapRef = useRef<Map<string, UIMessage>>(new Map());
  const [, forceUpdate] = useState({});
  
  // Update map when paginated messages change (infrequent)
  useEffect(() => {
    paginated.forEach(msg => {
      messageMapRef.current.set(msg.id, msg);
    });
    forceUpdate({}); // Trigger rerender
  }, [paginated]);
  
  // Incremental update for streaming messages (frequent)
  useEffect(() => {
    let hasChanges = false;
    streamQueries.forEach((msg, streamId) => {
      const existing = messageMapRef.current.get(msg.id);
      // Only update if message actually changed
      if (!existing || existing.text !== msg.text || existing.status !== msg.status) {
        messageMapRef.current.set(msg.id, msg);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      forceUpdate({}); // Trigger rerender
    }
  }, [streamQueries]);
  
  // useChat message update (very frequent)
  useEffect(() => {
    if (useChatMessage) {
      const existing = messageMapRef.current.get(useChatMessage.id);
      // Only update if changed
      if (!existing || existing.text !== useChatMessage.text) {
        messageMapRef.current.set(useChatMessage.id, useChatMessage);
        forceUpdate({});
      }
    }
  }, [useChatMessage]);
  
  // Convert map to sorted array (only when needed for render)
  return useMemo(() => {
    return sorted(Array.from(messageMapRef.current.values()));
  }, [forceUpdate]); // Recompute when forceUpdate changes
}
```

**Benefits:**
- ✅ O(1) message updates (Map.set/get)
- ✅ Only rerenders when messages actually change
- ✅ Stable references (same Map instance)
- ✅ Fast array reconstruction (just Array.from)

### 2. requestAnimationFrame Throttling

Throttle updates to once per frame (~60fps max):

```typescript
function useThrottledMessages(
  paginated: UIMessage[],
  streamQueries: Map<string, UIMessage>,
  useChatMessage?: UIMessage
) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const pendingUpdateRef = useRef<{
    paginated?: UIMessage[];
    streamQueries?: Map<string, UIMessage>;
    useChatMessage?: UIMessage;
  }>({});
  const rafIdRef = useRef<number>();
  
  // Accumulate updates
  useEffect(() => {
    pendingUpdateRef.current.paginated = paginated;
  }, [paginated]);
  
  useEffect(() => {
    pendingUpdateRef.current.streamQueries = streamQueries;
  }, [streamQueries]);
  
  useEffect(() => {
    pendingUpdateRef.current.useChatMessage = useChatMessage;
  }, [useChatMessage]);
  
  // Apply updates once per frame
  useEffect(() => {
    const update = () => {
      const { paginated, streamQueries, useChatMessage } = pendingUpdateRef.current;
      if (!paginated) return;
      
      const messageMap = new Map<string, UIMessage>();
      paginated.forEach(msg => messageMap.set(msg.id, msg));
      streamQueries?.forEach((msg, id) => {
        if (msg.status === "streaming" || msg.status === "pending") {
          messageMap.set(id, msg);
        }
      });
      if (useChatMessage) {
        messageMap.set(useChatMessage.id, useChatMessage);
      }
      
      setMessages(sorted(Array.from(messageMap.values())));
      rafIdRef.current = undefined;
    };
    
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(update);
    }
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [paginated, streamQueries, useChatMessage]);
  
  return messages;
}
```

**Benefits:**
- ✅ Max 60 updates per second (one per frame)
- ✅ Skips intermediate updates automatically
- ✅ Smooth UI updates

**Tradeoffs:**
- ⚠️ Slight delay (up to 16ms) for updates
- ⚠️ More complex lifecycle management

### 3. Hybrid Approach (Best of Both)

Combine ref-based map with RAF throttling:

```typescript
function useOptimizedMessagesHybrid(
  paginated: UIMessage[],
  streamQueries: Map<string, UIMessage>,
  useChatMessage?: UIMessage
) {
  const messageMapRef = useRef<Map<string, UIMessage>>(new Map());
  const [, forceUpdate] = useState({});
  const rafIdRef = useRef<number>();
  
  // Update map immediately (no throttling for paginated)
  useEffect(() => {
    paginated.forEach(msg => {
      messageMapRef.current.set(msg.id, msg);
    });
    forceUpdate({});
  }, [paginated]);
  
  // Throttle streaming updates
  const applyStreamingUpdate = useCallback(() => {
    let hasChanges = false;
    
    streamQueries.forEach((msg, streamId) => {
      const existing = messageMapRef.current.get(msg.id);
      if (!existing || existing.text !== msg.text || existing.status !== msg.status) {
        messageMapRef.current.set(msg.id, msg);
        hasChanges = true;
      }
    });
    
    if (useChatMessage) {
      const existing = messageMapRef.current.get(useChatMessage.id);
      if (!existing || existing.text !== useChatMessage.text) {
        messageMapRef.current.set(useChatMessage.id, useChatMessage);
        hasChanges = true;
      }
    }
    
    if (hasChanges && !rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        forceUpdate({});
        rafIdRef.current = undefined;
      });
    }
  }, [streamQueries, useChatMessage]);
  
  useEffect(() => {
    applyStreamingUpdate();
  }, [applyStreamingUpdate]);
  
  return useMemo(() => {
    return sorted(Array.from(messageMapRef.current.values()));
  }, [forceUpdate]);
}
```

**Benefits:**
- ✅ Fast O(1) updates
- ✅ Throttled to 60fps for streaming
- ✅ Immediate updates for paginated (user actions)
- ✅ Only rerenders when needed

### 4. Message-Level Memoization

Memoize individual message components to prevent unnecessary rerenders:

```typescript
const Message = React.memo(({ message }: { message: UIMessage }) => {
  // Component only rerenders if message reference changes
  return <div>{message.text}</div>;
}, (prev, next) => {
  // Custom comparison - only rerender if text or status changed
  return prev.message.id === next.message.id &&
         prev.message.text === next.message.text &&
         prev.message.status === next.message.status;
});
```

### 5. Virtual Scrolling (For Large Lists)

If you have many messages, only render visible ones:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedMessages({ messages }: { messages: UIMessage[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated message height
  });
  
  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <Message message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Recommendation:**

For most cases, use **Strategy #3 (Hybrid Approach)**:
- Ref-based map for O(1) updates
- RAF throttling for streaming (60fps max)
- Immediate updates for user actions (paginated)
- Message-level memoization for components

This gives you the best balance of performance and responsiveness!

---

## Isolating Rerenders: Context vs Hook Isolation

**The Problem:**
- `useChat` has internal state that rerenders frequently (every chunk)
- Reactive queries (`useQuery`) rerender when data changes
- If your `useMessages` hook directly depends on these, it rerenders too often
- UI components rerender every time, even with throttling

**The Goal:**
- UI hook (`messages.map(m => <Message message={m} />)`) should only rerender max once per frame
- Underlying hooks (`useChat`, `useQuery`) can rerender as much as they want
- Isolate the rerenders so UI doesn't see them

**Solution: Hook Isolation with Refs + RAF (Recommended)**

You don't need Zustand or Context! You can isolate rerenders within a single hook:

```typescript
function useMessages(threadId: string) {
  // 1. These hooks can rerender as much as they want
  //    Their rerenders won't affect the return value
  const paginated = usePaginatedQuery(api.messages.listThreadMessages, { threadId });
  const { messages: chatMessages } = useChat({ api: '/api/chat' });
  const streamQueries = useStreamQueries(threadId);
  
  // 2. Use refs to capture values without triggering rerenders
  const latestRef = useRef({
    paginated: paginated.results,
    chatMessages,
    streamQueries,
  });
  
  // 3. Update refs immediately (no rerender)
  useEffect(() => {
    latestRef.current = {
      paginated: paginated.results,
      chatMessages,
      streamQueries,
    };
  }, [paginated.results, chatMessages, streamQueries]);
  
  // 4. Throttled state that UI depends on
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const rafIdRef = useRef<number>();
  
  // 5. Merge and update state (throttled to 60fps)
  useEffect(() => {
    const update = () => {
      const { paginated, chatMessages, streamQueries } = latestRef.current;
      
      // Merge logic (runs max 60 times per second)
      const messageMap = new Map<string, UIMessage>();
      paginated.forEach(msg => messageMap.set(msg.id, msg));
      streamQueries.forEach((msg, id) => {
        if (msg.status === "streaming" || msg.status === "pending") {
          messageMap.set(id, msg);
        }
      });
      if (chatMessages.length > 0) {
        const lastChatMessage = chatMessages[chatMessages.length - 1];
        if (lastChatMessage.status === "streaming") {
          messageMap.set(lastChatMessage.id, lastChatMessage);
        }
      }
      
      setMessages(sorted(Array.from(messageMap.values())));
      rafIdRef.current = undefined;
    };
    
    // Schedule update (only if not already scheduled)
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(update);
    }
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [paginated.results, chatMessages, streamQueries]); // Dependencies trigger effect
  
  // 6. UI only rerenders when `messages` state changes (max 60fps)
  return messages;
}
```

**How This Works:**

1. **`useChat` and `useQuery` rerender frequently** → Their rerenders don't affect the return value
2. **Refs capture latest values** → `latestRef.current` is updated immediately (no rerender)
3. **Effect triggers on changes** → But only schedules a RAF update (doesn't rerender yet)
4. **RAF throttles state update** → `setMessages` only called max 60 times per second
5. **UI only depends on `messages` state** → Only rerenders when `messages` changes (max 60fps)

**Key Insight:**
- The hook itself can rerender (when `useChat` or `useQuery` rerender)
- But the **return value** (`messages`) only changes max 60fps
- UI components only rerender when `messages` changes
- The hook's internal rerenders are isolated from the UI

**Alternative: Zustand Store (If You Prefer)**

If you want complete separation, you can use Zustand:

```typescript
import { create } from 'zustand';

interface MessagesStore {
  messages: UIMessage[];
  updateMessages: (messages: UIMessage[]) => void;
}

const useMessagesStore = create<MessagesStore>((set) => ({
  messages: [],
  updateMessages: (messages) => set({ messages }),
}));

// In your component
function MessagesProvider({ threadId }: { threadId: string }) {
  const paginated = usePaginatedQuery(api.messages.listThreadMessages, { threadId });
  const { messages: chatMessages } = useChat({ api: '/api/chat' });
  const streamQueries = useStreamQueries(threadId);
  const updateMessages = useMessagesStore((s) => s.updateMessages);
  const rafIdRef = useRef<number>();
  
  useEffect(() => {
    const update = () => {
      // Merge logic...
      const merged = mergeMessages(paginated.results, streamQueries, chatMessages);
      updateMessages(merged); // Update store (throttled)
      rafIdRef.current = undefined;
    };
    
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(update);
    }
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [paginated.results, chatMessages, streamQueries, updateMessages]);
  
  return null; // This component doesn't render anything
}

// In your UI component
function MessagesList() {
  const messages = useMessagesStore((s) => s.messages); // Only rerenders when store updates
  return messages.map(m => <Message key={m.id} message={m} />);
}
```

**Zustand Benefits:**
- ✅ Complete separation (provider can rerender, consumers don't)
- ✅ Multiple components can subscribe
- ✅ Easier to debug (store is separate)

**Zustand Tradeoffs:**
- ⚠️ More boilerplate
- ⚠️ Need to wrap app with provider
- ⚠️ Slightly more complex

**Recommendation:**

**Use Hook Isolation (first approach)** unless you need:
- Multiple components subscribing to the same messages
- Complex state management across components
- Easier debugging of state updates

**Why Hook Isolation Works:**

```typescript
// This hook rerenders when useChat rerenders
function useMessages() {
  const { messages: chatMessages } = useChat(); // Rerenders every chunk
  
  // But this state only updates max 60fps
  const [messages, setMessages] = useState<UIMessage[]>([]);
  
  // Ref captures latest without rerender
  const latestRef = useRef(chatMessages);
  latestRef.current = chatMessages; // No rerender
  
  // RAF throttles state update
  useEffect(() => {
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        setMessages(merge(latestRef.current)); // Only max 60fps
      });
    }
  }, [chatMessages]); // Effect runs, but state update is throttled
  
  return messages; // UI only sees throttled updates
}

// UI component
function MessagesList() {
  const messages = useMessages(); // Only rerenders when messages state changes
  return messages.map(m => <Message message={m} />);
}
```

**The Magic:**
- `useMessages` hook can rerender (when `useChat` rerenders)
- But `messages` state only updates max 60fps
- UI components only rerender when `messages` changes
- Hook's internal rerenders are "isolated" from the return value

**You don't need Context or Zustand** - hook isolation with refs + RAF is sufficient and simpler!

---

## React Hooks and Rerenders: Understanding the Mechanism

**Your Question:** Do hooks' internal state changes cause component rerenders, or only returned values?

**Short Answer:** Only returned values (or values used in the return) cause rerenders. Internal state that's not returned doesn't cause rerenders.

**Detailed Explanation:**

### How React Rerenders Work

```typescript
// Component using a hook
function MyComponent() {
  const messages = useMessages(); // Hook call
  return <div>{messages.map(...)}</div>;
}
```

**What causes `MyComponent` to rerender?**

1. **Hook's return value changes** → Component rerenders
2. **Hook's internal state changes** → Only rerenders if that state is part of the return value
3. **Hook uses other hooks that rerender** → Component rerenders (because hook rerenders)

### Example 1: Internal State Not Returned

```typescript
function useCounter() {
  const [internalCount, setInternalCount] = useState(0);
  const [returnedCount, setReturnedCount] = useState(0);
  
  // This internal state change does NOT cause component rerender
  useEffect(() => {
    setInternalCount(prev => prev + 1); // Component doesn't rerender!
  }, []);
  
  return returnedCount; // Only this causes rerenders
}

function MyComponent() {
  const count = useCounter(); // Only rerenders when returnedCount changes
  return <div>{count}</div>;
}
```

**Key Point:** `internalCount` changes don't cause `MyComponent` to rerender because it's not returned.

### Example 2: Hook Uses Another Hook

```typescript
function useMessages() {
  // useChat has internal state that changes frequently
  const { messages: chatMessages } = useChat(); // This hook rerenders internally
  
  // When useChat's state changes, useChat rerenders
  // This causes useMessages to rerender (because chatMessages reference changes)
  // Which causes MyComponent to rerender (because useMessages rerenders)
  
  return chatMessages; // Component rerenders when this changes
}

function MyComponent() {
  const messages = useMessages(); // Rerenders when chatMessages changes
  return <div>{messages.map(...)}</div>;
}
```

**The Problem:** `useChat` rerenders → `useMessages` rerenders → `MyComponent` rerenders (every chunk!)

### Example 3: Isolating Rerenders with Refs

```typescript
function useMessages() {
  const { messages: chatMessages } = useChat(); // Rerenders frequently
  
  // Ref captures value without causing rerender
  const latestRef = useRef(chatMessages);
  latestRef.current = chatMessages; // Update ref (no rerender!)
  
  // State that component depends on (throttled)
  const [messages, setMessages] = useState<UIMessage[]>([]);
  
  // RAF throttles state update
  useEffect(() => {
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        setMessages(merge(latestRef.current)); // Only max 60fps
      });
    }
  }, [chatMessages]); // Effect runs, but state update is throttled
  
  return messages; // Component only rerenders when this changes (max 60fps)
}

function MyComponent() {
  const messages = useMessages(); // Only rerenders when messages state changes
  return <div>{messages.map(...)}</div>;
}
```

**What Happens:**

1. `useChat` internal state changes → `useChat` rerenders
2. `chatMessages` reference changes → `useMessages` hook rerenders
3. `latestRef.current` is updated (no rerender - refs don't cause rerenders!)
4. Effect schedules RAF update (no rerender yet)
5. RAF calls `setMessages` (max 60fps) → `messages` state changes
6. `MyComponent` rerenders (only when `messages` changes, max 60fps)

**Key Insights:**

- ✅ **Refs don't cause rerenders** - Updating `ref.current` doesn't trigger rerenders
- ✅ **Effects don't cause rerenders** - They run, but don't directly cause rerenders
- ✅ **Only state/props changes cause rerenders** - `setState` or prop changes
- ✅ **Hook rerenders ≠ Component rerenders** - Hook can rerender, but component only rerenders if return value changes

### The Flow Diagram

```
useChat internal state changes
  ↓
useChat rerenders (internal)
  ↓
chatMessages reference changes
  ↓
useMessages hook rerenders (because chatMessages changed)
  ↓
latestRef.current = chatMessages (no rerender - refs don't cause rerenders!)
  ↓
Effect runs (no rerender - effects don't cause rerenders!)
  ↓
RAF scheduled (no rerender yet!)
  ↓
RAF callback runs → setMessages() (max 60fps)
  ↓
messages state changes
  ↓
MyComponent rerenders (only when messages changes!)
```

### Why This Works

**The hook itself can rerender** (when `useChat` rerenders), but:
- The **return value** (`messages`) only changes max 60fps
- The **component** only rerenders when the return value changes
- The hook's internal rerenders are "isolated" from the component

**Think of it like this:**
- Hook rerenders = Hook function runs again
- Component rerenders = Component function runs again (only when return value changes)

**In our case:**
- `useMessages` hook rerenders frequently (when `useChat` rerenders)
- But `messages` return value only changes max 60fps
- So `MyComponent` only rerenders max 60fps

### Summary

**To answer your question directly:**

1. **Hooks' internal state changes** → Only cause rerenders if that state is part of the return value
2. **Hooks using other hooks** → Cause rerenders if the other hook's return value changes
3. **Refs** → Don't cause rerenders (updating `ref.current` is safe)
4. **Effects** → Don't cause rerenders (they run, but don't directly trigger rerenders)
5. **State updates** → Cause rerenders (`setState` triggers rerender)

**In our optimization:**
- `useChat` has internal state that changes frequently
- But we capture it in a ref (no rerender)
- We throttle the state update (max 60fps)
- Component only rerenders when throttled state changes

**The hook can rerender as much as it wants** - the component only rerenders when the return value changes!

### 3. React-Side: Message Consumption

#### useUIMessages Hook
The main hook that combines paginated and streaming messages:

```125:167:src/react/useUIMessages.ts
export function useUIMessages<Query extends UIMessagesQuery<any, any>>(
  query: Query,
  args: UIMessagesQueryArgs<Query> | "skip",
  options: {
    initialNumItems: number;
    stream?: Query extends StreamQuery
      ? boolean
      : ErrorMessage<"To enable streaming, your query must take in streamArgs: vStreamArgs and return a streams object returned from syncStreams. See docs.">;
    skipStreamIds?: string[];
  },
): UsePaginatedQueryResult<UIMessagesQueryResult<Query>> {
  // These are full messages
  const paginated = usePaginatedQuery(
    query,
    args as PaginatedQueryArgs<Query> | "skip",
    { initialNumItems: options.initialNumItems },
  );

  const startOrder = paginated.results.length
    ? Math.min(...paginated.results.map((m) => m.order))
    : 0;
  // These are streaming messages that will not include full messages.
  const streamMessages = useStreamingUIMessages(
    query as StreamQuery<UIMessagesQueryArgs<Query>>,
    !options.stream ||
      args === "skip" ||
      paginated.status === "LoadingFirstPage"
      ? "skip"
      : ({ ...args, paginationOpts: { cursor: null, numItems: 0 } } as any),
    { startOrder, skipStreamIds: options.skipStreamIds },
  );

  const merged = useMemo(() => {
    // Messages may have been split by pagination. Re-combine them here.
    const combined = combineUIMessages(sorted(paginated.results));
    return {
      ...paginated,
      results: dedupeMessages(combined, streamMessages ?? []),
    };
  }, [paginated, streamMessages]);

  return merged as UIMessagesQueryResult<Query>;
}
```

**Key Points:**
- Uses `usePaginatedQuery` for finalized messages
- Uses `useStreamingUIMessages` for ongoing streams
- `skipStreamIds` excludes streams already handled via HTTP
- Merges and deduplicates messages by `(order, stepOrder)`

#### useStreamingUIMessages Hook
Handles delta-based streaming (resumed streams):

```36:143:src/react/useStreamingUIMessages.ts
export function useStreamingUIMessages<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
  Query extends StreamQuery<any> = StreamQuery<object>,
>(
  query: Query,
  args: StreamQueryArgs<Query> | "skip",
  options?: {
    startOrder?: number;
    skipStreamIds?: string[];
  },
  // TODO: make generic on metadata, etc.
): UIMessage<METADATA, DATA_PARTS, TOOLS>[] | undefined {
  const [messageState, setMessageState] = useState<
    Record<
      string,
      {
        uiMessage: UIMessage<METADATA, DATA_PARTS, TOOLS>;
        cursor: number;
      }
    >
  >({});

  const streams = useDeltaStreams(query, args, options);

  const threadId = args === "skip" ? undefined : args.threadId;

  useEffect(() => {
    if (!streams) return;
    // return if there are no new deltas beyond the cursors
    let noNewDeltas = true;
    for (const stream of streams) {
      const lastDelta = stream.deltas.at(-1);
      const cursor = messageState[stream.streamMessage.streamId]?.cursor;
      if (!cursor) {
        noNewDeltas = false;
        break;
      }
      if (lastDelta && lastDelta.start >= cursor) {
        noNewDeltas = false;
        break;
      }
    }
    if (noNewDeltas) {
      return;
    }
    const abortController = new AbortController();
    void (async () => {
      const newMessageState: Record<
        string,
        {
          uiMessage: UIMessage<METADATA, DATA_PARTS, TOOLS>;
          cursor: number;
        }
      > = Object.fromEntries(
        await Promise.all(
          streams.map(async ({ deltas, streamMessage }) => {
            const { parts, cursor } = getParts<UIMessageChunk>(deltas, 0);
            if (streamMessage.format === "UIMessageChunk") {
              // Unfortunately this can't handle resuming from a UIMessage and
              // adding more chunks, so we re-create it from scratch each time.
              const uiMessage = await updateFromUIMessageChunks(
                blankUIMessage(streamMessage, threadId),
                parts,
              );
              return [
                streamMessage.streamId,
                {
                  uiMessage,
                  cursor,
                },
              ];
            } else {
              const [uiMessages] = deriveUIMessagesFromTextStreamParts(
                threadId,
                [streamMessage],
                [],
                deltas,
              );
              return [
                streamMessage.streamId,
                {
                  uiMessage: uiMessages[0],
                  cursor,
                },
              ];
              ];
            }
          }),
        ),
      );
      if (abortController.signal.aborted) return;
      setMessageState(newMessageState);
    })();
    return () => {
      abortController.abort();
    };
  }, [messageState, streams, threadId]);

  return useMemo(() => {
    if (!streams) return undefined;
    return streams
      .map(
        ({ streamMessage }) => messageState[streamMessage.streamId]?.uiMessage,
      )
      .filter((uiMessage) => uiMessage !== undefined);
  }, [messageState, streams]);
}
```

**Key Points:**
- Maintains cursor state per stream to track progress
- Recreates UIMessages from deltas when new data arrives
- Uses AI SDK's `readUIMessageStream` for UIMessageChunk format
- Uses custom `deriveUIMessagesFromTextStreamParts` for TextStreamPart format

#### useDeltaStreams Hook
Manages delta querying with cursor tracking:

```12:154:src/react/useDeltaStreams.ts
export function useDeltaStreams<
  Query extends StreamQuery<any> = StreamQuery<object>,
>(
  query: Query,
  args: StreamQueryArgs<Query> | "skip",
  options?: {
    startOrder?: number;
    skipStreamIds?: string[];
  },
): { streamMessage: StreamMessage; deltas: StreamDelta[] }[] | undefined {
  // We hold onto and modify state directly to avoid re-running unnecessarily.
  const [state] = useState<{
    startOrder: number;
    threadId: string | undefined;
    deltaStreams:
      | Array<{
          streamMessage: StreamMessage;
          deltas: StreamDelta[];
        }>
      | undefined;
  }>({
    startOrder: options?.startOrder ?? 0,
    deltaStreams: undefined,
    threadId: args === "skip" ? undefined : args.threadId,
  });
  const [cursors, setCursors] = useState<Record<string, number>>({});
  
  // ... state management ...

  // Get all the active streams
  const streamList = useQuery(
    query,
    args === "skip"
      ? args
      : ({
          ...args,
          streamArgs: {
            kind: "list",
            startOrder: state.startOrder,
          } as StreamArgs,
        } as FunctionArgs<Query>),
  ) as
    | { streams: Extract<SyncStreamsReturnValue, { kind: "list" }> }
    | undefined;

  const streamMessages =
    args === "skip"
      ? undefined
      : !streamList
        ? state.deltaStreams?.map(({ streamMessage }) => streamMessage)
        : sorted(
            streamList.streams.messages.filter(
              ({ streamId, order }) =>
                !options?.skipStreamIds?.includes(streamId) &&
                (!options?.startOrder || order >= options.startOrder),
            ),
          );

  // Get the deltas for all the active streams, if any.
  const cursorQuery = useQuery(
    query,
    args === "skip" || !streamMessages?.length
      ? ("skip" as const)
      : ({
          ...args,
          streamArgs: {
            kind: "deltas",
            cursors: streamMessages.map(({ streamId }) => ({
              streamId,
              cursor: cursors[streamId] ?? 0,
            })),
          } as StreamArgs,
        } as FunctionArgs<Query>),
  ) as
    | { streams: Extract<SyncStreamsReturnValue, { kind: "deltas" }> }
    | undefined;

  const newDeltas = cursorQuery?.streams.deltas;
  if (newDeltas?.length && streamMessages) {
    // ... merge new deltas with existing ones, update cursors ...
  }
  return state.deltaStreams;
}
```

**Key Points:**
- Two-phase query: first lists active streams, then fetches deltas
- Maintains cursors per stream to resume from correct position
- Filters out streams in `skipStreamIds` (for HTTP-streamed messages)
- Accumulates deltas and updates cursors incrementally

## The Three Reading Patterns

### 1. REST (No Streaming)

**When**: Viewing finalized messages, no active streams

**Implementation**:
```typescript
const { results, status, loadMore } = useUIMessages(
  api.messages.listThreadMessages,
  { threadId },
  { initialNumItems: 10, stream: false } // or omit stream
);
```

**Flow**:
1. `usePaginatedQuery` fetches messages from database
2. No streaming hook is called
3. Simple pagination with `loadMore()`

### 2. Streaming Initiated by This Browser

**When**: User sends a message via `useChat`, which streams via HTTP

**Implementation**:
```typescript
// In your component
const { messages, append } = useChat({
  api: '/api/chat',
  onFinish: (message) => {
    // Message is saved to Convex, will appear in paginated query
  }
});

// Separate query for all messages
const { results } = useUIMessages(
  api.messages.listThreadMessages,
  { threadId },
  { 
    initialNumItems: 10, 
    stream: true,
    skipStreamIds: [currentStreamId] // Exclude HTTP-streamed message
  }
);
```

**Flow**:
1. HTTP stream delivers chunks directly to `useChat`
2. `useChat` updates local state immediately
3. `useUIMessages` fetches paginated messages + other streams
4. `skipStreamIds` prevents double-fetching the HTTP-streamed message
5. When stream finishes, message appears in paginated results

**Key Insight**: The HTTP stream provides real-time updates for the initiated message, while paginated query provides all other messages. The `skipStreamIds` parameter ensures we don't query deltas for a stream we're already receiving via HTTP.

### 3. Streaming Resumed

**When**: Page loads with an ongoing stream, or another browser/tab initiated a stream

**Implementation**:
```typescript
const { results } = useUIMessages(
  api.messages.listThreadMessages,
  { threadId },
  { 
    initialNumItems: 10, 
    stream: true // Enables delta streaming
  }
);
```

**Flow**:
1. `usePaginatedQuery` fetches finalized messages
2. `useStreamingUIMessages` discovers active streams via `syncStreams(..., { kind: "list" })`
3. For each active stream, queries deltas from cursor 0 (or last known cursor)
4. `useDeltaStreams` maintains cursors and fetches new deltas incrementally
5. Deltas are converted to UIMessages via `updateFromUIMessageChunks` or `deriveUIMessagesFromTextStreamParts`
6. Messages are merged and deduplicated

**Key Insight**: The system polls for new deltas by maintaining cursor positions. When a new delta arrives (with `start >= cursor`), it's merged into the existing message state.

## Message Deduplication

The `dedupeMessages` function handles merging paginated and streaming messages:

```169:195:src/react/useUIMessages.ts
export function dedupeMessages<
  M extends {
    order: number;
    stepOrder: number;
    status: UIStatus;
  },
>(messages: M[], streamMessages: M[]): M[] {
  return sorted(messages.concat(streamMessages)).reduce((msgs, msg) => {
    const last = msgs.at(-1);
    if (!last) {
      return [msg];
    }
    if (last.order !== msg.order || last.stepOrder !== msg.stepOrder) {
      return [...msgs, msg];
    }
    if (
      (last.status === "pending" || last.status === "streaming") &&
      msg.status !== "pending"
    ) {
      // Let's prefer a streaming or finalized message over a pending
      // one.
      return [...msgs.slice(0, -1), msg];
    }
    // skip the new one if the previous one (listed) was finalized
    return msgs;
  }, [] as M[]);
}
```

**Deduplication Logic**:
- Messages are keyed by `(order, stepOrder)`
- If same key exists: prefer finalized/streaming over pending
- Streaming messages override pending ones
- Finalized messages are not overridden

## Performance Optimizations

1. **Cursor-based fetching**: Only fetches new deltas, not entire stream history
2. **Throttling**: Delta writes are throttled (250ms default) to reduce database load
3. **Compression**: Text deltas can be compressed before saving
4. **Cache-friendly startOrder**: Rounded down to nearest 10 for better query caching
5. **Conditional streaming**: Streaming hooks skip when pagination is loading first page
6. **Abort controllers**: Proper cleanup when components unmount or streams change

## Creating Your Own Hook

To create a performant hook that mixes all three patterns:

```typescript
function useMessages(threadId: string, options: {
  initialNumItems: number;
  httpStreamId?: string; // Stream ID from useChat
}) {
  // 1. Paginated query for finalized messages
  const paginated = usePaginatedQuery(
    api.messages.list,
    { threadId },
    { initialNumItems: options.initialNumItems }
  );

  // 2. Streaming messages (resumed streams)
  const streamMessages = useStreamingUIMessages(
    api.messages.list,
    paginated.status === "LoadingFirstPage" ? "skip" : { threadId },
    {
      startOrder: paginated.results.length 
        ? Math.min(...paginated.results.map(m => m.order))
        : 0,
      skipStreamIds: options.httpStreamId 
        ? [options.httpStreamId] 
        : undefined
    }
  );

  // 3. Merge and deduplicate
  const merged = useMemo(() => {
    const combined = combineUIMessages(sorted(paginated.results));
    return dedupeMessages(combined, streamMessages ?? []);
  }, [paginated, streamMessages]);

  return {
    ...paginated,
    results: merged
  };
}
```

**Key considerations**:
- Skip streaming when loading first page
- Pass `skipStreamIds` for HTTP-streamed messages
- Calculate `startOrder` from paginated results
- Merge and deduplicate properly
- Handle loading states

## Summary

The architecture elegantly handles three scenarios:

1. **REST**: Simple pagination, no streaming overhead
2. **HTTP Streaming**: Real-time updates via HTTP, excluded from delta queries
3. **Resumed Streaming**: Polling-based delta fetching with cursor tracking

The system is performant because:
- It only fetches what's needed (cursors, throttling)
- It avoids duplicate work (skipStreamIds)
- It merges efficiently (deduplication by key)
- It handles edge cases (loading states, cleanup)

The key insight is that **HTTP streams and delta streams are mutually exclusive** for the same streamId, which is why `skipStreamIds` is crucial for the HTTP streaming scenario.

