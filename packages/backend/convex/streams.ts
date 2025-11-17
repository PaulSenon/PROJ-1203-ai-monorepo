import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { INTERNAL_getCurrentUserOrThrow } from "./lib";
import { mutationWithRLS } from "./rls";
import { vv } from "./schema";

async function INTERNAL_CreateStream(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    threadId: Id<"threads">;
    messageId: Id<"messages">;
  }
) {
  const { userId, threadId, messageId } = args;

  const streamId = await ctx.db.insert("messageStreams", {
    userId,
    threadId,
    messageId,
  });

  return streamId;
}

async function INTERNAL_PushStreamDelta(
  ctx: MutationCtx,
  args: {
    streamId: Id<"messageStreams">;
    start: number;
    end: number;
    chunks: unknown[];
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
    streamId: Id<"messageStreams">;
  }
) {
  const { streamId } = args;
  await ctx.db.delete(streamId);
  const deltas = await ctx.db
    .query("streamDeltas")
    .withIndex("byStreamIdStartEnd", (q) => q.eq("streamId", streamId))
    .collect();
  await Promise.all(deltas.map((delta) => ctx.db.delete(delta._id)));
  return;
}

async function encodeStreamDelta(
  chunks: unknown[]
): Promise<Doc<"streamDeltas">["encodedChunks"]> {
  // TODO handle more encoding cases

  // json
  return {
    source: "inline",
    encoding: "json",
    data: JSON.stringify(chunks),
  };
}

export const createStream = mutationWithRLS({
  args: {
    threadId: vv.id("threads"),
    messageUuid: vv.doc("messages").fields.uuid,
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadId, messageUuid } = args;
    const message = await ctx.db
      .query("messages")
      .withIndex("byUserIdThreadIdUuid", (q) =>
        q
          .eq("userId", user._id)
          .eq("threadId", threadId)
          .eq("uuid", messageUuid)
      )
      .unique();
    if (!message) throw new ConvexError("Message not found");

    const streamId = await INTERNAL_CreateStream(ctx, {
      userId: user._id,
      threadId,
      messageId: message._id,
    });

    return { streamId };
  },
});

/**
 * Delete stream and all its deltas
 */
export const deleteStream = mutationWithRLS({
  args: {
    streamId: vv.id("messageStreams"),
  },
  async handler(ctx, args) {
    const { streamId } = args;
    await INTERNAL_DeleteStream(ctx, { streamId });
  },
});

// export const adminDeleteStream = internalMutation({
//   args: {
//     streamId: vv.id("messageStreams"),
//   },
//   async handler(ctx, args) {
//     const { streamId } = args;
//     await INTERNAL_DeleteStream(ctx, { streamId });
//   },
// });

export const pushStreamDelta = mutationWithRLS({
  args: {
    streamId: vv.id("messageStreams"),
    start: vv.number(),
    end: vv.number(),
    chunks: vv.array(vv.any()),
  },
  async handler(ctx, args) {
    // REMARK: no RLS on stream owner, but this is for performance. Perhaps someone can
    // hack into pending streams. But these are readonly and for resume only. So it
    // cannot have much impact. That's a tradeoff of more efficient intensive writes.
    const { streamId, start, end, chunks } = args;
    await INTERNAL_PushStreamDelta(ctx, {
      streamId,
      start,
      end,
      chunks,
    });
    return;
  },
});
