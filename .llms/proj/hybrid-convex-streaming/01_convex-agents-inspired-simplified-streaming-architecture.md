# Simplified Message Streaming Architecture

This document provides a complete implementation guide for a simplified message streaming architecture inspired by the Convex Agents component, but storing `UIMessage` directly (as AI SDK recommends) instead of `MessageDoc`.

## Table of Contents

1. [Data Structures (Convex Schema)](#1-data-structures-convex-schema)
2. [Convex Queries](#2-convex-queries)
3. [Convex Mutations](#3-convex-mutations)
4. [Backend streamText Logic](#4-backend-streamtext-logic)
5. [Client Logic (React Hooks)](#5-client-logic-react-hooks)
6. [Delta Chunking & Throttling](#6-delta-chunking--throttling)
7. [Teeing streamText to HTTP + Convex](#7-teeing-streamtext-to-http--convex)

---

## 1. Data Structures (Convex Schema)

### Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Main messages table - stores UIMessages directly
  messages: defineTable({
    // UIMessage fields
    id: v.string(), // AI SDK message ID
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    parts: v.array(v.any()), // UIPart[] - text, tool calls, etc.
    text: v.string(), // Extracted text for convenience
    status: v.union(
      v.literal("pending"), // Empty shell, streaming
      v.literal("streaming"), // Currently streaming
      v.literal("success"), // Completed
      v.literal("failed") // Failed
    ),
    
    // Threading
    threadId: v.id("threads"),
    
    // Optional metadata
    streamId: v.optional(v.string()), // Only present when status is "pending" or "streaming"
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    metadata: v.optional(v.any()),
    
    // Timestamps
    _creationTime: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_threadId_status", ["threadId", "status"])
    .index("by_streamId", ["streamId"]),

  // Stream metadata - tracks active streams
  streams: defineTable({
    streamId: v.string(),
    threadId: v.id("threads"),
    messageId: v.id("messages"), // Reference to the message being streamed
    status: v.union(
      v.object({
        kind: v.literal("streaming"),
        lastHeartbeat: v.number(),
      }),
      v.object({
        kind: v.literal("finished"),
        endedAt: v.number(),
      }),
      v.object({
        kind: v.literal("aborted"),
        reason: v.string(),
      }),
    ),
    format: v.optional(v.union(
      v.literal("UIMessageChunk"),
      v.literal("TextStreamPart")
    )),
  })
    .index("by_threadId_status", ["threadId", "status.kind"])
    .index("by_streamId", ["streamId"]),

  // Stream deltas - incremental chunks
  streamDeltas: defineTable({
    streamId: v.string(),
    start: v.number(), // Cursor start (inclusive)
    end: v.number(), // Cursor end (exclusive)
    parts: v.array(v.any()), // UIMessageChunk[] or TextStreamPart[]
  })
    .index("by_streamId_start_end", ["streamId", "start", "end"]),

  // Threads table
  threads: defineTable({
    title: v.optional(v.string()),
    userId: v.optional(v.string()),
    _creationTime: v.number(),
  }),
});
```

### Key Design Decisions

- **Store UIMessage directly**: As AI SDK recommends, not MessageDoc
- **streamId in messages**: When `status: "pending"` or `"streaming"`, message has `streamId`
- **Separate streams table**: Tracks stream lifecycle independently
- **streamDeltas table**: Stores incremental chunks with cursor positions

---

## 2. Convex Queries

### 2.1 Paginated Messages Query

```typescript
// convex/messages.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const listThreadMessages = query({
  args: {
    threadId: v.id("threads"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Simple paginated query over messages
    const result = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .paginate(args.paginationOpts);

    return result;
  },
});
```

**Returns**: `PaginationResult<UIMessage>`

### 2.2 Get Stream Deltas Query

```typescript
// convex/messages.ts
export const getStreamDeltas = query({
  args: {
    streamId: v.string(),
    cursor: v.optional(v.number()), // Start fetching from this cursor
  },
  handler: async (ctx, { streamId, cursor = 0 }) => {
    // Fetch all deltas from cursor onwards
    const deltas = await ctx.db
      .query("streamDeltas")
      .withIndex("by_streamId_start_end", (q) => 
        q.eq("streamId", streamId).gte("start", cursor)
      )
      .collect();

    // Sort by start position
    deltas.sort((a, b) => a.start - b.start);

    return deltas;
  },
});
```

**Returns**: `StreamDelta[]`

---

## 3. Convex Mutations

### 3.1 Create Message Shell

```typescript
// convex/messages.ts
import { mutation } from "./_generated/server";

export const createMessageShell = mutation({
  args: {
    threadId: v.id("threads"),
    streamId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create empty message with "pending" status
    const messageId = await ctx.db.insert("messages", {
      id: args.streamId, // Use streamId as message ID
      role: args.role,
      parts: [],
      text: "",
      status: "pending",
      threadId: args.threadId,
      streamId: args.streamId,
      agentName: args.agentName,
      model: args.model,
      _creationTime: Date.now(),
    });

    // Create stream metadata
    await ctx.db.insert("streams", {
      streamId: args.streamId,
      threadId: args.threadId,
      messageId,
      status: {
        kind: "streaming",
        lastHeartbeat: Date.now(),
      },
      format: "UIMessageChunk",
    });

    return messageId;
  },
});
```

### 3.2 Add Stream Delta

```typescript
// convex/messages.ts
export const addStreamDelta = mutation({
  args: {
    streamId: v.string(),
    start: v.number(),
    end: v.number(),
    parts: v.array(v.any()), // UIMessageChunk[]
  },
  handler: async (ctx, { streamId, start, end, parts }) => {
    // Insert delta
    await ctx.db.insert("streamDeltas", {
      streamId,
      start,
      end,
      parts,
    });

    // Update stream heartbeat
    const stream = await ctx.db
      .query("streams")
      .withIndex("by_streamId", (q) => q.eq("streamId", streamId))
      .first();

    if (stream && stream.status.kind === "streaming") {
      await ctx.db.patch(stream._id, {
        status: {
          kind: "streaming",
          lastHeartbeat: Date.now(),
        },
      });
    }

    return true;
  },
});
```

### 3.3 Finish Message

```typescript
// convex/messages.ts
export const finishMessage = mutation({
  args: {
    streamId: v.string(),
    message: v.any(), // Complete UIMessage
  },
  handler: async (ctx, { streamId, message }) => {
    // Find the message by streamId
    const existingMessage = await ctx.db
      .query("messages")
      .withIndex("by_streamId", (q) => q.eq("streamId", streamId))
      .first();

    if (!existingMessage) {
      throw new Error(`Message with streamId ${streamId} not found`);
    }

    // Update message with full content
    await ctx.db.patch(existingMessage._id, {
      id: message.id,
      parts: message.parts,
      text: message.text,
      status: "success",
      streamId: undefined, // Remove streamId when done
    });

    // Mark stream as finished
    const stream = await ctx.db
      .query("streams")
      .withIndex("by_streamId", (q) => q.eq("streamId", streamId))
      .first();

    if (stream) {
      await ctx.db.patch(stream._id, {
        status: {
          kind: "finished",
          endedAt: Date.now(),
        },
      });
    }

    // Schedule cleanup (delete stream and deltas after 5 minutes)
    await ctx.scheduler.runAfter(
      5 * 60 * 1000, // 5 minutes
      internal.messages.cleanupStream,
      { streamId }
    );

    return existingMessage._id;
  },
});
```

### 3.4 Abort Stream

```typescript
// convex/messages.ts
export const abortStream = mutation({
  args: {
    streamId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, { streamId, reason }) => {
    // Find and update stream
    const stream = await ctx.db
      .query("streams")
      .withIndex("by_streamId", (q) => q.eq("streamId", streamId))
      .first();

    if (stream) {
      await ctx.db.patch(stream._id, {
        status: {
          kind: "aborted",
          reason,
        },
      });
    }

    // Update message status if it exists
    const message = await ctx.db
      .query("messages")
      .withIndex("by_streamId", (q) => q.eq("streamId", streamId))
      .first();

    if (message) {
      await ctx.db.patch(message._id, {
        status: "failed",
        streamId: undefined,
      });
    }
  },
});
```

### 3.5 Cleanup Stream (Internal)

```typescript
// convex/messages.ts
import { internalMutation } from "./_generated/server";

export const cleanupStream = internalMutation({
  args: {
    streamId: v.string(),
  },
  handler: async (ctx, { streamId }) => {
    // Delete all deltas
    const deltas = await ctx.db
      .query("streamDeltas")
      .withIndex("by_streamId_start_end", (q) => q.eq("streamId", streamId))
      .collect();

    for (const delta of deltas) {
      await ctx.db.delete(delta._id);
    }

    // Delete stream metadata
    const stream = await ctx.db
      .query("streams")
      .withIndex("by_streamId", (q) => q.eq("streamId", streamId))
      .first();

    if (stream) {
      await ctx.db.delete(stream._id);
    }
  },
});
```

---

## 4. Backend streamText Logic

### 4.1 HTTP Route Handler (Custom Setup with streamToEventIterator)

**Your Setup:**
- `result.consumeStream()` (no await) - handles client disconnects
- `result.toUIMessageStream()` - get the stream
- `streamToEventIterator(stream)` - your infrastructure requirement

**The Challenge:** `toUIMessageStream()` can only be consumed once, but you need to:
1. Save deltas to Convex (consume the stream)
2. Return it via `streamToEventIterator` (consume the stream again)

**Solution:** Tee the async iterable into two independent streams.

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages } from "ai";
import { ConvexHttpClient } from "convex/browser";
import type { UIMessage, UIMessageChunk } from "ai";
import { streamToEventIterator } from "@/lib/your-infrastructure"; // Your function

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Tee an async iterable into two independent streams
 */
function teeAsyncIterable<T>(
  iterable: AsyncIterable<T>
): [AsyncIterable<T>, AsyncIterable<T>] {
  const iterator = iterable[Symbol.asyncIterator]();
  const buffers: T[][] = [[], []];
  let done = false;
  let error: Error | null = null;

  const createStream = (index: number): AsyncIterable<T> => {
    return {
      async *[Symbol.asyncIterator]() {
        let readIndex = 0;

        while (true) {
          // If we have buffered items, yield them
          if (readIndex < buffers[index].length) {
            yield buffers[index][readIndex++];
            continue;
          }

          // If stream is done, we're finished
          if (done) {
            if (error) throw error;
            return;
          }

          // Read next item from source
          try {
            const { value, done: iteratorDone } = await iterator.next();

            if (iteratorDone) {
              done = true;
              return;
            }

            // Buffer for both streams
            buffers[0].push(value);
            buffers[1].push(value);

            // Yield to this stream
            yield value;
            readIndex++;
          } catch (e) {
            done = true;
            error = e instanceof Error ? e : new Error(String(e));
            throw error;
          }
        }
      },
    };
  };

  return [createStream(0), createStream(1)];
}

export async function POST(req: Request) {
  const { messages, threadId }: { messages: UIMessage[]; threadId: string } =
    await req.json();

  // Generate streamId
  const streamId = crypto.randomUUID();

  // Create message shell in Convex (non-blocking)
  const createShellPromise = convex
    .mutation(api.messages.createMessageShell, {
      threadId,
      streamId,
      role: "assistant",
    })
    .catch((error) => {
      console.error("Failed to create message shell:", error);
    });

  // Start streaming
  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    abortSignal: req.signal,
  });

  // Consume stream even if client disconnects (fire-and-forget)
  result.consumeStream();

  // Get the UIMessage stream with all your options
  // ✅ All options (originalMessages, generateMessageId, onFinish, messageMetadata, etc.)
  //    are applied here and preserved in the stream
  const stream = result.toUIMessageStream({
    originalMessages: messages,
    generateMessageId: () => newMessageUuid,
    sendSources: true,
    sendReasoning: true,
    sendFinish: true,
    sendStart: true,
    onFinish: async ({ responseMessage, isAborted, isContinuation }) => {
      console.log("on Stream Finish", {
        responseMessage,
        isAborted,
        isContinuation,
      });
      
      // ✅ Wait for delta saving to complete before proceeding
      // This ensures all deltas are saved before we save the final message
      await deltaSavePromise.catch((error) => {
        console.error("Delta saving failed:", error);
        // Continue anyway - don't block onFinish
      });
      
      // Wait for shell creation (should be done by now)
      await createShellPromise;
      
      // ✅ Your existing onFinish logic (upsertThread, upsertMessage, etc.)
      // make sure all deferred promises are settled
      await Promise.allSettled(__deferredPromises);
      
      const lastMessageStatus = isAborted
        ? "cancelled"
        : (responseMessage.metadata?.liveStatus ?? "completed");
      
      await fetchMutation(api.chat.upsertThread, {
        threadUuid: thread.uuid,
        patch: {
          liveStatus: lastMessageStatus,
        },
      });
      
      await fetchMutation(api.chat.upsertMessage, {
        threadId: thread._id,
        uiMessage: responseMessage,
        liveStatus: lastMessageStatus,
      });
      
      // ✅ Also save final message to Convex (if not aborted)
      if (!isAborted) {
        await convex.mutation(api.messages.finishMessage, {
          streamId,
          message: responseMessage,
        });
      } else {
        // Mark stream as aborted in Convex
        await convex.mutation(api.messages.abortStream, {
          streamId,
          reason: "HTTP stream aborted",
        });
      }
    },
    messageMetadata({ part }) {
      // ... your existing messageMetadata logic
    },
  });

  // ✅ Fork/tee the stream: creates two independent streams from one source
  // Both streams preserve all the options/callbacks from toUIMessageStream()
  // This is necessary because async iterables are single-consumption
  const [httpStream, deltaStream] = teeAsyncIterable(stream);

  // ✅ You still have access to ALL result helpers:
  // - result.text (Promise<string>)
  // - result.usage (Promise<Usage>)
  // - result.finishReason (Promise<FinishReason>)
  // - result.response (Promise<Response>)
  // - result.fullStream (AsyncIterable<StreamPart>)
  // - result.textStream (AsyncIterable<string>)
  // - result.consumeStream() (already called)
  // - result.toDataStream() (creates new stream)
  // - result.toTextStreamResponse() (creates new stream)
  // - result.toUIMessageStreamResponse() (creates new stream - but don't use this if you've already consumed toUIMessageStream())

  // Create delta saver
  const deltaSaver = new DeltaSaver(streamId, threadId, {
    throttleMs: 250,
    compress: true,
  });

  // Start saving deltas (non-blocking, fire-and-forget)
  // This runs in parallel with HTTP streaming
  const deltaSavePromise = (async () => {
    try {
      for await (const chunk of deltaStream) {
        await deltaSaver.addChunk(chunk);
      }
      await deltaSaver.finish();
    } catch (error) {
      console.error("Error saving deltas:", error);
      // Don't throw - HTTP stream should continue
    }
  })();

  // ✅ onFinish will fire ONCE when the stream completes (not twice!)
  // It's tied to the stream lifecycle, not to how many consumers there are
  // We just need to ensure delta saving completes before onFinish logic runs
  // So we'll wait for it inside onFinish if needed

  // Return HTTP stream via your infrastructure
  // ✅ Use httpStream (from the tee) - it has all the same options/behaviors as the original
  // The only change from your original code: use httpStream instead of stream
  return streamToEventIterator(httpStream);
  
  // ❌ This WON'T work:
  // return streamToEventIterator(stream); // stream is already consumed by tee
  
  // ✅ This works - httpStream preserves all your toUIMessageStream() options:
  // - originalMessages
  // - generateMessageId
  // - onFinish callback
  // - messageMetadata callback
  // - sendSources, sendReasoning, sendFinish, sendStart
  // All behaviors are preserved because they're baked into the stream when you call toUIMessageStream()
}
```

**Important Notes:**

1. **`consumeStream()`**: Called without await to handle client disconnects. This ensures the stream is consumed even if the HTTP connection drops.

2. **Tee Function**: Creates two independent async iterables from one source. Both streams receive the same chunks, but can be consumed independently.

3. **Delta Saving**: Runs in parallel (fire-and-forget) and doesn't block the HTTP stream.

4. **Result Helpers Still Available**: After teeing, you still have access to:
   - `result.text` - Promise of final text
   - `result.usage` - Promise of token usage
   - `result.finishReason` - Promise of finish reason
   - `result.response` - Promise of full response with messages
   - `result.fullStream` - Full stream with all parts (can be consumed separately)
   - `result.textStream` - Text-only stream (can be consumed separately)
   - `result.toDataStream()` - Creates a NEW data stream (doesn't conflict)
   - `result.toTextStreamResponse()` - Creates a NEW text stream response (doesn't conflict)
   
   **Why Tee/Fork?** Async iterables are single-consumption. Once you start consuming `stream`, you can't consume it again. The tee/fork pattern creates two independent streams from one source.
   
   **Key Point**: All your `toUIMessageStream()` options (callbacks, metadata, etc.) are preserved in both teed streams because they're applied when you call `toUIMessageStream()`, not when you consume the stream.
   
   ```typescript
   // ❌ This WON'T work - can't consume same stream twice:
   const stream = result.toUIMessageStream({ /* options */ });
   for await (const chunk of stream) { /* save to Convex */ }
   for await (const chunk of stream) { /* send to HTTP - EMPTY! */ }
   
   // ✅ This WORKS - tee creates two independent streams with same behaviors:
   const stream = result.toUIMessageStream({ /* all your options */ });
   const [httpStream, deltaStream] = teeAsyncIterable(stream);
   // Both streams have the same options/callbacks from toUIMessageStream()
   for await (const chunk of deltaStream) { /* save to Convex */ }
   return streamToEventIterator(httpStream); /* send to HTTP - WORKS! */ }
   ```
   
   **Important**: After teeing, you must use `httpStream` (not the original `stream`) for HTTP, because the original stream is consumed internally by the tee function. But `httpStream` has all the same behaviors as the original!
   
   **Note**: Don't call `result.toUIMessageStream()` again after teeing - it returns the same stream reference that's already been consumed.

5. **`onFinish` Only Fires Once**: The `onFinish` callback in `toUIMessageStream()` is tied to the stream's lifecycle, not to individual consumers. Even though you tee the stream into two consumers (`httpStream` and `deltaStream`), `onFinish` will only fire **once** when the underlying stream completes. This is the correct behavior - you don't need to worry about it firing twice.

6. **No Separate `handleCompletion` Needed**: Since `onFinish` already handles completion, you don't need a separate `handleCompletion` function. Just ensure delta saving completes within `onFinish` by awaiting `deltaSavePromise` before your final message save logic.

### 4.2 DeltaSaver Class

**Important**: `toUIMessageStream()` can only be consumed once. We use `createUIMessageStream` to consume it once, save deltas as we iterate, and forward chunks to the HTTP stream.

```typescript
// lib/delta-saver.ts
import { ConvexHttpClient } from "convex/browser";
import type { UIMessageChunk } from "ai";

export class DeltaSaver {
  private pendingParts: UIMessageChunk[] = [];
  private cursor = 0;
  private lastWrite = Date.now();
  private writePromise: Promise<void> | null = null;

  constructor(
    private streamId: string,
    private threadId: string,
    private config: { throttleMs: number; compress: boolean } = {
      throttleMs: 250,
      compress: true,
    }
  ) {}

  async addChunk(chunk: UIMessageChunk): Promise<void> {
    this.pendingParts.push(chunk);

    const timeSinceLastWrite = Date.now() - this.lastWrite;

    if (timeSinceLastWrite >= this.config.throttleMs && !this.writePromise) {
      this.writePromise = this.flush();
      await this.writePromise;
      this.writePromise = null;
    }
  }

  async finish(): Promise<void> {
    // Flush any remaining parts
    if (this.pendingParts.length > 0) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.pendingParts.length === 0) return;

    const parts = this.config.compress
      ? this.compressUIMessageChunks(this.pendingParts)
      : this.pendingParts;

    const start = this.cursor;
    const end = this.cursor + parts.length;

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    await convex.mutation(api.messages.addStreamDelta, {
      streamId: this.streamId,
      start,
      end,
      parts,
    });

    this.cursor = end;
    this.pendingParts = [];
    this.lastWrite = Date.now();
  }

  private compressUIMessageChunks(
    parts: UIMessageChunk[]
  ): UIMessageChunk[] {
    const compressed: UIMessageChunk[] = [];

    for (const part of parts) {
      const last = compressed.at(-1);

      if (
        (part.type === "text-delta" || part.type === "reasoning-delta") &&
        last?.type === part.type &&
        part.id === last.id
      ) {
        last.delta += part.delta;
      } else {
        compressed.push(part);
      }
    }

    return compressed;
  }
}
```


---

## 5. Client Logic (React Hooks)

### 5.1 Main Hook: useMessages

```typescript
// hooks/useMessages.ts
import { usePaginatedQuery, useQueries } from "convex/react";
import { useChat } from "@ai-sdk/react";
import { useMemo, useState, useRef, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import type { UIMessage } from "ai";

export function useMessages(
  threadId: string,
  options: {
    initialNumItems?: number;
    chatApi?: string; // API route for useChat
  } = {}
) {
  const { initialNumItems = 10, chatApi = "/api/chat" } = options;

  // 1. Paginated messages
  const paginated = usePaginatedQuery(
    api.messages.listThreadMessages,
    { threadId },
    { initialNumItems }
  );

  // 2. useChat for HTTP streaming (if initiated by this client)
  const { messages: chatMessages } = useChat({
    api: chatApi,
    body: { threadId },
  });

  // 3. Find pending messages with streamIds
  const pendingMessages = useMemo(
    () =>
      paginated.results.filter(
        (m) => m.status === "pending" || m.status === "streaming"
      ),
    [paginated.results]
  );

  const streamIds = useMemo(
    () => pendingMessages.map((m) => m.streamId).filter(Boolean) as string[],
    [pendingMessages]
  );

  // 4. Query streams for pending messages (using useQueries)
  const streamQueries = useQueries(
    useMemo(() => {
      const queries: Record<string, { query: any; args: any }> = {};
      streamIds.forEach((streamId) => {
        queries[streamId] = {
          query: api.messages.getStreamDeltas,
          args: { streamId },
        };
      });
      return queries;
    }, [streamIds])
  );

  // 5. Materialize UIMessages from stream deltas
  const streamedMessages = useMemo(() => {
    const messages = new Map<string, UIMessage>();

    Object.entries(streamQueries).forEach(([streamId, result]) => {
      if (result && !(result instanceof Error) && Array.isArray(result)) {
        const deltas = result;
        const message = materializeMessageFromDeltas(streamId, deltas);
        if (message) {
          messages.set(streamId, message);
        }
      }
    });

    return messages;
  }, [streamQueries]);

  // 6. Merge all messages with throttling
  const messages = useOptimizedMerge(
    paginated.results,
    streamedMessages,
    chatMessages
  );

  return {
    ...paginated,
    results: messages,
  };
}
```

### 5.2 Optimized Merge with Throttling

```typescript
// hooks/useOptimizedMerge.ts
import { useState, useRef, useEffect, useMemo } from "react";
import type { UIMessage } from "ai";

export function useOptimizedMerge(
  paginated: UIMessage[],
  streamedMessages: Map<string, UIMessage>,
  chatMessages: UIMessage[]
) {
  const messageMapRef = useRef<Map<string, UIMessage>>(new Map());
  const [, forceUpdate] = useState({});
  const rafIdRef = useRef<number>();

  // Update map immediately for paginated (no throttling)
  useEffect(() => {
    paginated.forEach((msg) => {
      messageMapRef.current.set(msg.id, msg);
    });
    forceUpdate({});
  }, [paginated]);

  // Throttle streaming updates
  useEffect(() => {
    const update = () => {
      let hasChanges = false;

      // Update from streamed messages
      streamedMessages.forEach((msg, streamId) => {
        const existing = messageMapRef.current.get(msg.id);
        if (!existing || existing.text !== msg.text || existing.status !== msg.status) {
          messageMapRef.current.set(msg.id, msg);
          hasChanges = true;
        }
      });

      // Update from useChat (HTTP stream)
      if (chatMessages.length > 0) {
        const lastChatMessage = chatMessages[chatMessages.length - 1];
        if (lastChatMessage.status === "streaming" || lastChatMessage.status === "pending") {
          const existing = messageMapRef.current.get(lastChatMessage.id);
          if (!existing || existing.text !== lastChatMessage.text) {
            messageMapRef.current.set(lastChatMessage.id, lastChatMessage);
            hasChanges = true;
          }
        }
      }

      if (hasChanges && !rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          forceUpdate({});
          rafIdRef.current = undefined;
        });
      }
    };

    update();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [streamedMessages, chatMessages]);

  return useMemo(() => {
    return Array.from(messageMapRef.current.values()).sort(
      (a, b) => a._creationTime - b._creationTime
    );
  }, [forceUpdate]);
}
```

### 5.3 Materialize UIMessage from Deltas

```typescript
// lib/delta-materialization.ts
import { readUIMessageStream } from "ai";
import type { UIMessage, UIMessageChunk } from "ai";
import type { StreamDelta } from "@/convex/schema";

export async function materializeMessageFromDeltas(
  streamId: string,
  deltas: StreamDelta[]
): Promise<UIMessage | null> {
  if (deltas.length === 0) return null;

  // Flatten all parts from deltas
  const allParts: UIMessageChunk[] = [];
  for (const delta of deltas) {
    allParts.push(...(delta.parts as UIMessageChunk[]));
  }

  // Use AI SDK's readUIMessageStream to reconstruct
  const messages: UIMessage[] = [];
  for await (const message of readUIMessageStream(allParts)) {
    messages.push(message);
  }

  return messages[0] || null;
}
```

---

## 6. Delta Chunking & Throttling

### 6.1 Configuration Options

```typescript
interface DeltaSaverConfig {
  throttleMs?: number; // Time between delta writes (default: 250ms)
  compress?: boolean; // Compress consecutive text deltas (default: true)
}
```

### 6.2 How It Works

**Throttling:**
- Accumulates chunks in `pendingParts` array
- Only writes to Convex when `throttleMs` has passed since last write
- Ensures we don't write too frequently (reduces database load)

**Compression:**
- Within each batch (between writes), concatenates consecutive `text-delta` chunks with the same `id`
- Example:
  ```
  Before: [
    { type: "text-delta", id: "text-1", delta: "H" },
    { type: "text-delta", id: "text-1", delta: "e" },
    { type: "text-delta", id: "text-1", delta: "l" },
  ]
  After: [
    { type: "text-delta", id: "text-1", delta: "Hel" }
  ]
  ```

**Cursor Tracking:**
- Each delta has `start` and `end` cursor positions
- `start`: inclusive, `end`: exclusive
- Allows clients to resume from specific positions

### 6.3 Recommended Settings

```typescript
// For fast streaming (low latency)
const fastConfig = {
  throttleMs: 100, // Write every 100ms
  compress: true,
};

// For efficient streaming (less database writes)
const efficientConfig = {
  throttleMs: 500, // Write every 500ms
  compress: true,
};

// For maximum efficiency (fewest writes)
const maxEfficiencyConfig = {
  throttleMs: 1000, // Write every 1 second
  compress: true,
};
```

**Tradeoffs:**
- Lower `throttleMs`: More responsive, more database writes
- Higher `throttleMs`: Less responsive, fewer database writes
- Compression: Always recommended (reduces parts without losing data)

---

## 7. Teeing streamText to HTTP + Convex

### 7.1 The Challenge

We need to:
1. Stream to HTTP client via `toUIMessageStreamResponse()` (critical path)
2. Simultaneously save deltas to Convex (non-blocking, fire-and-forget)
3. Never block the HTTP stream on Convex operations
4. Ensure deltas are saved even if HTTP stream is aborted

### 7.2 Solution: Use `createUIMessageStream`

**Critical**: `toUIMessageStream()` can only be consumed once. We use `createUIMessageStream` to:
1. Consume `toUIMessageStream()` once
2. Save deltas to Convex as we iterate (non-blocking)
3. Forward chunks to HTTP stream via `writer.write()`

**See Section 4.1** for the complete implementation. The key is:

```typescript
const stream = createUIMessageStream({
  async execute({ writer }) {
    // Consume toUIMessageStream() once
    for await (const chunk of result.toUIMessageStream()) {
      // Save delta (non-blocking, fire-and-forget)
      deltaSaver.addChunk(chunk).catch(console.error);
      
      // Forward to HTTP stream
      writer.write(chunk);
    }
    return finalMessages;
  },
  onFinish: async ({ messages }) => {
    // Finish delta saving + save final message
  },
});

return stream.toDataStreamResponse();
```

**Why This Works:**
- ✅ **Single consumption**: `toUIMessageStream()` is consumed once in `execute()`
- ✅ **Non-blocking deltas**: `deltaSaver.addChunk()` is fire-and-forget
- ✅ **HTTP stream never blocked**: Delta saving errors don't affect HTTP response
- ✅ **Proper completion**: `onFinish` ensures cleanup happens

---

## Summary

This architecture provides:

✅ **Simpler than Convex Agents**: Stores UIMessage directly (AI SDK recommendation)  
✅ **Performant**: Throttled delta writes, compressed chunks, RAF-throttled UI updates  
✅ **Resilient**: HTTP stream never blocked by Convex operations  
✅ **Reactive**: Clients automatically see updates via Convex queries  
✅ **Flexible**: Supports HTTP streaming, resumed streaming, and REST patterns  

**Key Files:**
- `convex/schema.ts`: Database schema
- `convex/messages.ts`: Queries and mutations
- `app/api/chat/route.ts`: HTTP route handler with teeing
- `hooks/useMessages.ts`: React hook for consuming messages
- `lib/delta-saver.ts`: Delta saving logic with throttling/compression

