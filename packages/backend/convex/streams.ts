import type { MyUIMessageChunk } from "@ai-monorepo/ai/types/uiMessage";
import { ConvexError, type Validator, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { InternalFindThreadByUuid } from "./chat";
import { INTERNAL_getCurrentUserOrThrow } from "./lib";
import { mutationWithRLS, queryWithRLS } from "./rls";
import { vv } from "./schema";
import { cleanupWorkpool } from "./workpool";

// SPEC: must always have one single stream per thread
// SPEC: if existing stream, delete it and create a new one
async function INTERNAL_CreateStream(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    threadId: Id<"threads">;
  }
) {
  const { userId, threadId } = args;

  // 1. check if a stream already exists for this thread
  const oldStream = await INTERNAL_FindThreadStream(ctx, { userId, threadId });

  // 2. if exists, delete it
  if (oldStream) {
    await INTERNAL_DeleteStream(ctx, { streamId: oldStream._id });
  }

  // 3. create a new stream
  const newStreamId = await ctx.db.insert("threadStreams", {
    userId,
    threadId,
  });

  return newStreamId;
}

async function INTERNAL_PushStreamDelta(
  ctx: MutationCtx,
  args: {
    streamId: Id<"threadStreams">;
    start: number;
    end: number;
    chunks: MyUIMessageChunk[];
  }
) {
  const { streamId, start, end, chunks } = args;

  const encodedChunks = await encodeStreamDelta(chunks);

  const streamDeltaId = await ctx.db.insert("streamDeltas", {
    streamId,
    start,
    end,
    encodedChunks,
  });

  return streamDeltaId;
}

async function INTERNAL_DeleteStream(
  ctx: MutationCtx,
  args: {
    streamId: Id<"threadStreams">;
  }
) {
  const { streamId } = args;

  // 1. check if stream exists
  const stream = await ctx.db.get(streamId);
  if (!stream) {
    console.warn("Stream not found. Skipping deletion.", streamId);
    return;
  }
  if (stream.deletedAt) {
    console.warn("Stream already pending deletion. Skipping.", streamId);
    return;
  }

  // 2. soft delete the stream
  await ctx.db.patch(streamId, {
    deletedAt: Date.now(),
  });

  // 3. schedule delta cleanup
  await cleanupWorkpool.enqueueMutation(
    ctx,
    internal.streams.deleteDeltasBatch,
    { streamId, cursor: null },
    { runAfter: 0 }
  );

  return;
}

export async function INTERNAL_GetStreamDelta(
  ctx: QueryCtx | MutationCtx,
  args: {
    streamId: Id<"threadStreams">;
    start: number;
    size: number;
  }
): Promise<{ chunks: MyUIMessageChunk[]; start: number; end: number } | null> {
  const { streamId, start, size } = args;

  // 1. get stream deltas
  const streamDeltas = await ctx.db
    .query("streamDeltas")
    .withIndex("byStreamIdStartEnd", (q) =>
      q.eq("streamId", streamId).gte("start", start)
    )
    .order("asc")
    .take(size);

  const firstDelta = streamDeltas.at(0);
  const lastDelta = streamDeltas.at(-1);
  if (!(lastDelta && firstDelta)) {
    console.warn("No deltas found for stream", streamId);
    // TODO: don't know yet if we should return null or empty delta. I do this for now, but if makes sense to return something else for better client dx, feel free to change this.
    return null;
  }

  // 2. decode each delta into UIMessageChunk[]
  const decodedDeltasChunks = await Promise.all(
    streamDeltas.map((d) => decodeStreamDelta(d.encodedChunks))
  );

  // 3. aggregate all deltas into one single big delta for ease of use
  // TODO: not super readable and prone to error and order issues.
  const aggregatedChunks = decodedDeltasChunks.flat();

  return {
    chunks: aggregatedChunks,
    start: firstDelta.start,
    end: lastDelta.end,
  };
}

export async function INTERNAL_FindThreadStream(
  ctx: QueryCtx | MutationCtx,
  args: {
    userId: Id<"users">;
    threadId: Id<"threads">;
  }
) {
  const { userId, threadId } = args;
  const stream = await ctx.db
    .query("threadStreams")
    .withIndex("byUserIdThreadIdDeletedAt", (q) =>
      q.eq("userId", userId).eq("threadId", threadId).eq("deletedAt", undefined)
    )
    .unique();
  return stream;
}

async function encodeStreamDelta(
  chunks: MyUIMessageChunk[]
): Promise<Doc<"streamDeltas">["encodedChunks"]> {
  // json
  return {
    source: "inline",
    encoding: "json",
    data: JSON.stringify(chunks),
  };
}
async function decodeStreamDelta(
  encodedChunks: Doc<"streamDeltas">["encodedChunks"]
): Promise<MyUIMessageChunk[]> {
  // json
  return JSON.parse(encodedChunks.data) as MyUIMessageChunk[];
}

export const createStream = mutationWithRLS({
  args: {
    threadId: vv.id("threads"),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadId } = args;

    const streamId = await INTERNAL_CreateStream(ctx, {
      userId: user._id,
      threadId,
    });

    return { streamId };
  },
});

/**
 * Delete stream and all its deltas
 */
export const deleteStream = mutationWithRLS({
  args: {
    streamId: vv.id("threadStreams"),
  },
  async handler(ctx, args) {
    const { streamId } = args;

    await INTERNAL_DeleteStream(ctx, { streamId });

    return;
  },
});

export const pushStreamDelta = mutationWithRLS({
  args: {
    streamId: vv.id("threadStreams"),
    start: vv.number(),
    end: vv.number(),
    chunks: vv.array(vv.any()) as Validator<MyUIMessageChunk[]>,
  },
  async handler(ctx, args) {
    const { streamId, start, end, chunks } = args;

    const stream = await ctx.db.get(streamId);
    if (!stream) throw new ConvexError("Stream not found");

    // REMARK: no RLS on stream owner, but this is for performance. Perhaps someone can
    // hack into pending streams. But these are readonly and for resume only. So it
    // cannot have much impact. That's a tradeoff of more efficient intensive writes.

    await INTERNAL_PushStreamDelta(ctx, {
      streamId,
      start,
      end,
      chunks,
    });
    return;
  },
});

/**
 * @warning YOU CANNOT USE usePaginatedQuery. WE USE A CUSTOM PAGINATION LOGIC HERE.
 * @warning MAKE SURE YOU USE useQuery FROM convex/react. AND NOT FROM convex-helpers/react/cache/hooks.
 * => otherwise you will induce super expensive queries and egress that grows exponentially.
 *
 * @description
 * - a thread can have only one single stream associated with.
 * - if a new stream is created, the old stream is deleted. You can detect this by checking the streamId change.
 * - a stream is uniquely linked to one message of this thread.
 * - the returned uiMessageChunks delta are intended to be accumulated and merged back into an incomplete UIMessage object on each update.
 * - the start param indicated the ai-sdk chunk index. It is intended to be:
 *   - 0 for the first page
 *   - previousDelta.end for the next delta.
 * - the returned delta is an aggregation of all accumulated chunks so far on the server (from the given `start` param)
 *
 *  @example
 * it's designed to be used in a kind of loop where as soon as you get result for this query,
 * you accumulate the delta in a state and you change query params to point to the next delta
 * using the last delta end prop.
 * It's kind of an eager pagination where you always listen for new deltas as soon as you received some.
 * This is only to avoid reacting to the full delta history and induce performance and cost issues.
 * ```ts
 * function useStreamingUiMessageChunks(threadUuid: string) {
 *  const [uiMessageChunks, setUiMessageChunks] = useState<MyUIMessageChunk[]>([]);
 *  const [start, setStart] = useState(0);
 *  const streamIdRef = useRef<Id<"threadStreams"> | null>(null);
 *
 *  const result = useQuery(api.streams.listThreadStreamingDelta, { threadUuid, start });
 *
 *  useEffect(() => {
 *    if (!result) return;
 *
 *    // reset state if stream id changes
 *    if (result.streamId !== streamIdRef.current) {
 *      streamIdRef.current = result.streamId;
 *      setUiMessageChunks([]);
 *      setStart(0);
 *      return;
 *    }
 *
 *    if (!result.delta) return;
 *    if (result.delta.start < start) return;
 *    if (result.delta.end <= start) return;
 *    if (result.delta.chunks.length === 0) return;
 *
 *    setUiMessageChunks(prev => [...prev, ...result.delta.chunks]);
 *    setStart(result.delta.end);
 *  }, [result]);
 * }
 * ```
 *
 * @param threadUuid - the uuid of the thread to list streaming uiMessageChunks for
 * @param start - the start index of the delta to list (initial is 0)
 *
 * @throws {ConvexError} if thread not found or deleted
 *
 * @returns {null} if no stream found
 * @returns {...} if stream found
 */
export const listThreadStreamingDelta = queryWithRLS({
  args: {
    threadUuid: v.string(),
    start: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    streamId: Id<"threadStreams">;
    delta: {
      chunks: MyUIMessageChunk[];
      start: number;
      end: number;
    } | null;
  } | null> => {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadUuid, start = 0 } = args;

    // 1. resolve thread id from uuid
    const thread = await InternalFindThreadByUuid(ctx, {
      userId: user._id,
      threadUuid,
    });

    if (!thread) throw new ConvexError("Thread not found");
    if (thread.lifecycleState === "deleted")
      throw new ConvexError("Thread has been deleted");

    // 2. retrieve stream for this thread
    const stream = await INTERNAL_FindThreadStream(ctx, {
      userId: user._id,
      threadId: thread._id,
    });

    if (!stream) return null;

    // 3. retrieve uiMessageChunks page from existing stream
    const delta = await INTERNAL_GetStreamDelta(ctx, {
      streamId: stream._id,
      start,
      size: 100,
    });

    return {
      streamId: stream._id,
      delta,
    };
  },
});

/**
 * @description
 * This is a low-priority internal batch deletion of stream deltas.
 * This allow big stream deletion in background without blocking or impacting other operations.
 * It suggests you mark the stream as deleted (soft delete) before calling this mutation.
 * At the end of all deletions, the stream is hard deleted.
 * Eventually consistent.
 *
 * @param streamId - the id of the stream to delete deltas for
 * @param cursor - the cursor of the page to delete (initial is null) - using convex pagination
 */
export const deleteDeltasBatch = internalMutation({
  args: {
    streamId: v.id("threadStreams"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const { streamId, cursor } = args;

    // 1. get a page of deltas to delete
    const batch = await ctx.db
      .query("streamDeltas")
      .withIndex("byStreamIdStartEnd", (q) => q.eq("streamId", streamId))
      .paginate({ cursor, numItems: 2 }); // TODO: make this 100, once tested

    // 2. delete each delta
    for (const delta of batch.page) {
      await ctx.db.delete(delta._id);
    }

    // 3. if not done, schedule next batch deletion
    if (!batch.isDone) {
      await cleanupWorkpool.enqueueMutation(
        ctx,
        internal.streams.deleteDeltasBatch,
        { streamId, cursor: batch.continueCursor },
        { runAfter: 0 }
      );
    }

    // 4. if done, hard delete the stream
    if (batch.isDone) {
      await ctx.db.delete(streamId);
    }
  },
});
