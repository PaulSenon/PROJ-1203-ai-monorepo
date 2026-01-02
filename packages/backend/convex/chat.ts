import {
  type MyUIMessage,
  validateMyUIMessages,
} from "@ai-monorepo/ai/types/uiMessage";
import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { ConvexError, type Validator, v } from "convex/values";
import { partial } from "convex-helpers/validators";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { INTERNAL_getCurrentUserOrThrow } from "./lib";
import { mutationWithRLS, queryWithRLS } from "./rls";
import { lifecycleStates, liveStatuses, vv } from "./schema";
import {
  INTERNAL_FindMessageStream,
  INTERNAL_ListStreamDeltas,
} from "./streams";
import { INTERNAL_upsertUserChatPreferences } from "./users";

async function InternalDeleteMessageWithParts(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    messageId: Id<"messages">;
  }
) {
  const { userId, messageId } = args;
  // TODO: ensure RLS cover this case because we don't check ownership here. (I think it does)
  // Soft delete message metadata
  await ctx.db.patch(messageId, {
    lifecycleState: "deleted",
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Hard delete real message content
  const messageParts = await ctx.db
    .query("messageParts")
    .withIndex("byUserIdMessageId", (q) =>
      q.eq("userId", userId).eq("messageId", messageId)
    )
    .collect();

  await Promise.all(
    messageParts.map((messagePart) => ctx.db.delete(messagePart._id))
  );
}

async function InternalDeleteThreadWithMessages(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    threadId: Id<"threads">;
  }
) {
  const { userId, threadId } = args;
  // TODO: ensure RLS cover this case because we don't check ownership here. (I think it does)
  // Soft delete thread metadata
  await ctx.db.patch(threadId, {
    lifecycleState: "deleted",
    deletedAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Soft delete all messages
  const messages = await ctx.db
    .query("messages")
    .withIndex("byUserIdThreadIdStateOrdered", (q) =>
      q.eq("userId", userId).eq("threadId", threadId)
    )
    .collect();
  await Promise.all(
    messages.map((message) =>
      InternalDeleteMessageWithParts(ctx, { userId, messageId: message._id })
    )
  );
}

// DONE
async function InternalUpsertDraft(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    threadId: Id<"threads">;
    patch?: {
      data?: Doc<"drafts">["data"];
    };
  }
) {
  const { threadId, userId, patch } = args;

  const existingDraft = await ctx.db
    .query("drafts")
    .withIndex("byUserIdThreadId", (q) =>
      q.eq("userId", userId).eq("threadId", threadId)
    )
    .unique();

  const now = Date.now();
  if (!existingDraft) {
    const draftId = await ctx.db.insert("drafts", {
      userId,
      threadId,
      createdAt: now,
      updatedAt: now,
      data: patch?.data,
    });
    return draftId;
  }

  await ctx.db.patch(existingDraft._id, {
    ...patch,
    updatedAt: now,
  });

  return existingDraft._id;
}

// DONE
async function InternalUpsertThread(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    threadUuid: string;
    patch: Partial<Doc<"threads">>;
    canPatchThread?: (thread: Doc<"threads">) => boolean;
  }
) {
  const { threadUuid, userId, patch, canPatchThread } = args;

  const existingThread = await ctx.db
    .query("threads")
    .withIndex("byUserIdUuid", (q) =>
      q.eq("userId", userId).eq("uuid", threadUuid)
    )
    .unique();

  const now = Date.now();
  if (!existingThread) {
    const threadId = await ctx.db.insert("threads", {
      ...patch,
      lifecycleState: patch?.lifecycleState ?? "active",
      liveStatus: patch?.liveStatus ?? "completed",
      uuid: threadUuid,
      createdAt: now,
      updatedAt: now,
      userId,
    });
    return threadId;
  }

  if (canPatchThread && !canPatchThread(existingThread)) {
    throw new ConvexError(
      "CRITICAL: Thread is not allowed to be patched because of custom canPatchThread function."
    );
  }

  await ctx.db.patch(existingThread._id, {
    ...patch,
    updatedAt: now,
  });

  return existingThread._id;
}

async function encodeMessageParts(
  parts: unknown[]
): Promise<Doc<"messageParts">["encodedParts"]> {
  // TODO handle more encoding cases

  // json
  return {
    source: "inline",
    encoding: "json",
    data: JSON.stringify(parts),
  };
}
async function decodeMessageParts(
  encodedParts: Doc<"messageParts">["encodedParts"]
): Promise<unknown[]> {
  if (encodedParts.source === "cvxstorage")
    throw new ConvexError("Convex storage not yet implemented");

  if (encodedParts.encoding === "json") {
    const decoded = JSON.parse(encodedParts.data) as unknown;
    if (!Array.isArray(decoded))
      throw new ConvexError("decoded parts format invalid (not an array)");
    return decoded;
  }

  throw new ConvexError("decoder not implemented for message parts");
}

// DONE
async function InternalUpsertMessageParts(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    messageId: Id<"messages">;
    parts: unknown[];
  }
) {
  const { messageId, parts, userId } = args;

  const messageParts = await ctx.db
    .query("messageParts")
    .withIndex("byUserIdMessageId", (q) =>
      q.eq("userId", userId).eq("messageId", messageId)
    )
    .unique();

  const encodedPartPromises = encodeMessageParts(parts);
  if (!messageParts) {
    const messagePartsId = await ctx.db.insert("messageParts", {
      userId,
      messageId,
      encodedParts: await encodedPartPromises,
    });
    return messagePartsId;
  }
  await ctx.db.patch(messageParts._id, {
    encodedParts: await encodedPartPromises,
  });
  return messageParts._id;
}

async function InternalUpsertMessageWithParts(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    threadId: Id<"threads">;
    uiMessage: MyUIMessage;
    patch?: {
      role?: Doc<"messages">["role"];
      lifecycleState?: Doc<"messages">["lifecycleState"];
      liveStatus?: Doc<"messages">["liveStatus"];
      modelId?: Doc<"messages">["modelId"];
    };
    now: number;
    bulkOrder: number;
  }
) {
  const { uiMessage, threadId, patch, userId } = args;

  const message = await ctx.db
    .query("messages")
    .withIndex("byUserIdThreadIdUuid", (q) =>
      q.eq("userId", userId).eq("threadId", threadId).eq("uuid", uiMessage.id)
    )
    .unique();

  const now = args.now;
  if (!message) {
    const messageId = await ctx.db.insert("messages", {
      userId,
      threadId,
      uuid: uiMessage.id,
      updatedAt: now,
      createdAtBulkOrder: args.bulkOrder,
      createdAt: uiMessage.metadata?.createdAt ?? now,
      role: patch?.role ?? uiMessage.role,
      modelId: patch?.modelId ?? uiMessage.metadata?.modelId,
      lifecycleState:
        patch?.lifecycleState ?? uiMessage.metadata?.lifecycleState ?? "active",
      liveStatus:
        patch?.liveStatus ?? uiMessage.metadata?.liveStatus ?? "pending",
      error: uiMessage.metadata?.error,
    });
    await InternalUpsertMessageParts(ctx, {
      userId,
      messageId,
      parts: uiMessage.parts,
    });
    return messageId;
  }

  // TODO; make this better. Was to fix patching but without using message metadata.
  const patch2 = {
    ...patch,
    role: patch?.role ?? uiMessage.role,
    modelId: patch?.modelId ?? uiMessage.metadata?.modelId,
    lifecycleState:
      patch?.lifecycleState ?? uiMessage.metadata?.lifecycleState ?? "active",
    liveStatus:
      patch?.liveStatus ?? uiMessage.metadata?.liveStatus ?? "pending",
    error: uiMessage.metadata?.error,
  };
  await ctx.db.patch(message._id, {
    ...patch2,
    updatedAt: now,
  });
  await InternalUpsertMessageParts(ctx, {
    userId,
    messageId: message._id,
    parts: uiMessage.parts,
  });
  return message._id;
}

async function InternalGetMessageParts(
  ctx: MutationCtx | QueryCtx,
  args: {
    userId: Id<"users">;
    messageId: Id<"messages">;
  }
) {
  const parts = await ctx.db
    .query("messageParts")
    .withIndex("byUserIdMessageId", (q) =>
      q.eq("userId", args.userId).eq("messageId", args.messageId)
    )
    .unique();

  if (!parts) throw new ConvexError("message part not found");

  const decodedParts = await decodeMessageParts(parts.encodedParts);

  return decodedParts;
}

// Reconstruct message with parts and metadata for frontend
async function InternalRetrieveUiMessage(
  ctx: QueryCtx | MutationCtx,
  args: {
    userId: Id<"users">;
    messageId: Id<"messages">;
  }
): Promise<MyUIMessage> {
  const message = await ctx.db.get(args.messageId);
  if (!message) throw new ConvexError("message not found");

  const parts = await InternalGetMessageParts(ctx, {
    userId: args.userId,
    messageId: message._id,
  });

  return {
    id: message.uuid,
    // biome-ignore lint/suspicious/noExplicitAny: will be checked bellow with validateMyUIMessages
    parts: parts as any,
    // biome-ignore lint/suspicious/noExplicitAny: will be checked bellow with validateMyUIMessages
    role: message.role as any,
    metadata: {
      modelId: message.modelId,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      lifecycleState: message.lifecycleState,
      liveStatus: message.liveStatus,
      error: message.error,
    },
  } satisfies MyUIMessage;
}

// DONE
// 1. get messages from threadId and userId by createdAt asc
// 2. for each message get its parts and reconstruct UIMessage object
// 3. validate type MyUiMessage[]
async function InternalGetAllThreadMessagesAsc(
  ctx: QueryCtx | MutationCtx,
  args: {
    userId: Id<"users">;
    threadId: Id<"threads">;
  }
) {
  const messages = await ctx.db
    .query("messages")
    .withIndex("byUserIdThreadIdStateOrdered", (q) =>
      q
        .eq("userId", args.userId)
        .eq("threadId", args.threadId)
        .eq("lifecycleState", "active")
    )
    .order("asc")
    .collect();

  const messagesWithParts = await Promise.all(
    messages.map(async (message) => {
      const fullMessage = await InternalRetrieveUiMessage(ctx, {
        userId: args.userId,
        messageId: message._id,
      });
      return fullMessage;
    })
  );

  // this is where we check
  const validatedMessages = await validateMyUIMessages(messagesWithParts);

  return validatedMessages;
}

// DONE
// for front: get all messages in thread
export const getAllThreadMessagesAsc = queryWithRLS({
  args: {
    threadUuid: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const thread = await ctx.db
      .query("threads")
      .withIndex("byUserIdUuid", (q) =>
        q.eq("userId", user._id).eq("uuid", args.threadUuid)
      )
      .unique();

    // TODO: error or nothing ?
    if (!thread) return [];

    const threadId = thread._id;
    const messages = await InternalGetAllThreadMessagesAsc(ctx, {
      threadId,
      userId: user._id,
    });
    return messages;
  },
});

export function InternalFindThreadByUuid(
  ctx: QueryCtx | MutationCtx,
  args: {
    userId: Id<"users">;
    threadUuid: string;
  }
) {
  return ctx.db
    .query("threads")
    .withIndex("byUserIdUuid", (q) =>
      q.eq("userId", args.userId).eq("uuid", args.threadUuid)
    )
    .unique();
}

export function InternalFindMessageByUuid(
  ctx: QueryCtx | MutationCtx,
  args: {
    userId: Id<"users">;
    threadId: Id<"threads">;
    messageUuid: string;
  }
) {
  return ctx.db
    .query("messages")
    .withIndex("byUserIdThreadIdUuid", (q) =>
      q
        .eq("userId", args.userId)
        .eq("threadId", args.threadId)
        .eq("uuid", args.messageUuid)
    )
    .unique();
}
export const listThreadUiMessagesPaginated = queryWithRLS({
  args: {
    threadUuid: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): Promise<PaginationResult<MyUIMessage>> => {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);

    // 1. resolve thread id from uuid
    const thread = await InternalFindThreadByUuid(ctx, {
      userId: user._id,
      threadUuid: args.threadUuid,
    });

    if (!thread) {
      return {
        page: [],
        isDone: true,
        splitCursor: null,
        continueCursor: "",
      };
    }
    if (thread.lifecycleState === "deleted")
      throw new ConvexError("Thread is deleted");

    // 2. get messages page from thread id
    const messages = await ctx.db
      .query("messages")
      .withIndex("byUserIdThreadIdStateOrdered", (q) =>
        q
          .eq("userId", user._id)
          .eq("threadId", thread._id)
          .eq("lifecycleState", "active")
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // 3. retrieve message parts for each message
    const uiMessages = await Promise.all(
      messages.page.map((message) =>
        InternalRetrieveUiMessage(ctx, {
          userId: user._id,
          messageId: message._id,
        })
      )
    );

    return {
      ...messages,
      page: uiMessages,
    };
  },
});

// TODO find a way to have stream delta without 2 roundtrip + find a way to cache them
export const listThreadStreamingMessagesPaginated = queryWithRLS({
  args: {
    threadUuid: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);

    // 1. resolve thread id from uuid
    const thread = await InternalFindThreadByUuid(ctx, {
      userId: user._id,
      threadUuid: args.threadUuid,
    });

    if (!thread) throw new ConvexError("Thread not found");
    if (thread.lifecycleState === "deleted")
      throw new ConvexError("Thread is deleted");

    // 2. get messages page from thread id
    const messages = await ctx.db
      .query("messages")
      .withIndex("byUserIdThreadIdStateOrdered", (q) =>
        q
          .eq("userId", user._id)
          .eq("threadId", thread._id)
          .eq("lifecycleState", "active")
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // 3. retrieve stream deltas for each message
    const streams = await Promise.all(
      messages.page.map((message) =>
        INTERNAL_FindMessageStream(ctx, {
          userId: user._id,
          threadId: thread._id,
          messageId: message._id,
        })
      )
    );

    // 4. retrieve stream deltas for existing streams
    const streamDeltas = await Promise.all(
      streams.map((stream) =>
        stream === null
          ? null
          : INTERNAL_ListStreamDeltas(ctx, {
              streamId: stream._id,
            })
      )
    );

    return {
      ...messages,
      page: streamDeltas.filter((d) => d !== null),
    };
  },
});

// DONE
// for frontend, for when we encounter a message in a streaming status, to retrieve stream deltas
// in a reactive way. Those UIMessageChunks can be merged back into a UIMessage object using readUIMessageStream
export const findMessageStream = queryWithRLS({
  args: {
    threadUuid: v.string(),
    messageUuid: v.string(),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);

    const thread = await InternalFindThreadByUuid(ctx, {
      userId: user._id,
      threadUuid: args.threadUuid,
    });

    if (!thread) throw new ConvexError("Thread not found");

    const message = await InternalFindMessageByUuid(ctx, {
      userId: user._id,
      threadId: thread._id,
      messageUuid: args.messageUuid,
    });
    if (!message) throw new ConvexError("Message not found");

    const stream = await INTERNAL_FindMessageStream(ctx, {
      userId: user._id,
      threadId: thread._id,
      messageId: message._id,
    });

    if (!stream) return null;

    const deltas = await INTERNAL_ListStreamDeltas(ctx, {
      streamId: stream._id,
    });

    return deltas;
  },
});

// DONE
// for frontend: sidebar listing all threads (by updatedAt most recent first)
// paginated
export const getThreadsForListing = queryWithRLS({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const paginatedThreads = await ctx.db
      .query("threads")
      .withIndex("byUserIdStateUpdatedAt", (q) =>
        q.eq("userId", user._id).eq("lifecycleState", "active")
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return paginatedThreads;
  },
});

// DONE
// for frontend: upsert message and its parts
export const upsertMessage = mutationWithRLS({
  args: {
    threadId: v.id("threads"),
    uiMessage: v.any() as Validator<MyUIMessage>,
    role: v.optional(v.string()),
    lifecycleState: v.optional(lifecycleStates),
    liveStatus: v.optional(liveStatuses),
    modelId: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadId, uiMessage, lifecycleState, liveStatus, modelId, role } =
      args;
    const [validUiMessage] = await validateMyUIMessages([uiMessage]);
    const messageId = await InternalUpsertMessageWithParts(ctx, {
      threadId,
      userId: user._id,
      uiMessage: validUiMessage,
      now: Date.now(),
      bulkOrder: 0,
      patch: {
        lifecycleState,
        liveStatus,
        modelId,
        role,
      },
    });

    return messageId;
  },
});

// DONE
// update message
export const updateMessage = mutationWithRLS({
  args: {
    messageId: v.id("messages"),
    uiMessage: v.any(),
    role: v.optional(v.string()),
    lifecycleState: v.optional(lifecycleStates),
    liveStatus: v.optional(liveStatuses),
    modelId: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { messageId, uiMessage, lifecycleState, liveStatus, modelId, role } =
      args;
    const [validUiMessage] = await validateMyUIMessages([uiMessage]);

    const messagePatch = {
      role: role ?? validUiMessage.role,
      lifecycleState:
        lifecycleState ?? validUiMessage?.metadata?.lifecycleState,
      liveStatus: liveStatus ?? validUiMessage?.metadata?.liveStatus,
      modelId: modelId ?? validUiMessage?.metadata?.modelId,
    };
    // TODO: ensure RLS cover this case because we don't check ownership here
    const patchMessagePromise = ctx.db.patch(messageId, {
      ...messagePatch,
      updatedAt: Date.now(),
    });

    const patchMessagePartsPromise = await InternalUpsertMessageParts(ctx, {
      messageId,
      userId: user._id,
      parts: validUiMessage.parts,
    });

    await Promise.all([patchMessagePromise, patchMessagePartsPromise]);

    return;
  },
});

// DONE
// delete message
export const deleteMessage = mutationWithRLS({
  args: {
    messageId: v.id("messages"),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { messageId } = args;

    await InternalDeleteMessageWithParts(ctx, { userId: user._id, messageId });

    return;
  },
});

// DONE
// for frontend
export const upsertDraft = mutationWithRLS({
  args: {
    threadUuid: v.string(),
    data: v.string(),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadUuid, data } = args;

    const thread = await ctx.db
      .query("threads")
      .withIndex("byUserIdUuid", (q) =>
        q.eq("userId", user._id).eq("uuid", threadUuid)
      )
      .unique();

    if (!thread)
      throw new ConvexError("Cannot create draft for non existing thread");

    await InternalUpsertDraft(ctx, {
      threadId: thread._id,
      userId: user._id,
      patch: {
        data,
      },
    });

    return;
  },
});

// DONE
// for frontend
export const deleteDraft = mutationWithRLS({
  args: {
    threadUuid: v.string(),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadUuid } = args;

    const thread = await ctx.db
      .query("threads")
      .withIndex("byUserIdUuid", (q) =>
        q.eq("userId", user._id).eq("uuid", threadUuid)
      )
      .unique();

    if (!thread) {
      console.log(`deleteDraft: thread not found: ${threadUuid}`);
      return;
    }

    const draft = await ctx.db
      .query("drafts")
      .withIndex("byUserIdThreadId", (q) =>
        q.eq("userId", user._id).eq("threadId", thread._id)
      )
      .unique();

    if (!draft) {
      console.log(`deleteDraft: draft not found: ${threadUuid}`);
      return;
    }

    await ctx.db.delete(draft._id);

    return;
  },
});

// DONE
// for frontend
export const getDraft = queryWithRLS({
  args: {
    threadUuid: v.string(),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadUuid } = args;
    const thread = await ctx.db
      .query("threads")
      .withIndex("byUserIdUuid", (q) =>
        q.eq("userId", user._id).eq("uuid", threadUuid)
      )
      .unique();

    if (!thread) return null;

    const draft = await ctx.db
      .query("drafts")
      .withIndex("byUserIdThreadId", (q) =>
        q.eq("userId", user._id).eq("threadId", thread._id)
      )
      .unique();

    return draft;
  },
});

// DONE
// for frontend: upsert thread for optimistic update paginated thread listings
export const upsertThreadClient = mutationWithRLS({
  args: {
    threadUuid: vv.doc("threads").fields.uuid,
    patch: partial(
      vv.object({
        title: vv.optional(vv.doc("threads").fields.title),
        lifecycleState: vv.optional(vv.doc("threads").fields.lifecycleState),
        liveStatus: vv.optional(vv.doc("threads").fields.liveStatus),
        lastUsedModelId: vv.optional(vv.doc("threads").fields.lastUsedModelId),
      })
    ),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadUuid, patch } = args;
    const threadId = await InternalUpsertThread(ctx, {
      threadUuid,
      userId: user._id,
      patch,
      canPatchThread: (t) => {
        if (t.liveStatus === "streaming") {
          throw new ConvexError("Thread is already streaming. Retry later.");
        }
        if (patch.liveStatus === "streaming") {
          throw new ConvexError(
            "Cannot set liveStatus to streaming from client."
          );
        }

        return true;
      },
    });
    return threadId;
  },
});

// for backend
export const upsertThread = mutationWithRLS({
  args: {
    threadUuid: vv.doc("threads").fields.uuid,
    patch: partial(
      vv.object({
        title: vv.optional(vv.doc("threads").fields.title),
        lifecycleState: vv.optional(vv.doc("threads").fields.lifecycleState),
        liveStatus: vv.optional(vv.doc("threads").fields.liveStatus),
        lastUsedModelId: vv.optional(vv.doc("threads").fields.lastUsedModelId),
      })
    ),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadUuid, patch } = args;
    const threadId = await InternalUpsertThread(ctx, {
      threadUuid,
      userId: user._id,
      patch,
    });
    return threadId;
  },
});

// DONE
// for frontend: get thread from uuid
export const getThread = queryWithRLS({
  args: {
    threadUuid: v.string(),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadUuid } = args;
    const thread = await ctx.db
      .query("threads")
      .withIndex("byUserIdUuid", (q) =>
        q.eq("userId", user._id).eq("uuid", threadUuid)
      )
      .unique();
    return thread;
  },
});

// DONE
// update thread
export const updateThread = mutationWithRLS({
  args: {
    threadId: vv.id("threads"),
    title: vv.optional(vv.doc("threads").fields.title),
    lifecycleState: vv.optional(vv.doc("threads").fields.lifecycleState),
    liveStatus: vv.optional(vv.doc("threads").fields.liveStatus),
    lastUsedModelId: vv.optional(vv.doc("threads").fields.lastUsedModelId),
  },
  async handler(ctx, args) {
    await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadId, ...patch } = args;

    // TODO: ensure RLS cover this case because we don't check ownership here
    await ctx.db.patch(threadId, {
      ...patch,
      updatedAt: Date.now(),
    });

    return;
  },
});

// DONE
// delete thread
export const deleteThread = mutationWithRLS({
  args: {
    threadId: v.id("threads"),
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadId } = args;

    await InternalDeleteThreadWithMessages(ctx, { userId: user._id, threadId });

    return;
  },
});

// DONE
// for backend to do everything in one go (new message)
// 1. get or create thread
// 2. set new/fist messages
// 3. collect all messages for this thread.
export const upsertThreadWithNewMessagesAndReturnHistory = mutationWithRLS({
  args: {
    threadUuid: vv.doc("threads").fields.uuid,
    uiMessages: v.array(v.any()),
    threadPatch: partial(
      vv.object({
        title: vv.optional(vv.doc("threads").fields.title),
        lifecycleState: vv.optional(vv.doc("threads").fields.lifecycleState),
        liveStatus: vv.optional(vv.doc("threads").fields.liveStatus),
        lastUsedModelId: vv.optional(vv.doc("threads").fields.lastUsedModelId),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadUuid, uiMessages, threadPatch } = args;
    const threadIdPromise = InternalUpsertThread(ctx, {
      threadUuid,
      userId: user._id,
      patch: threadPatch,
      canPatchThread: (t) => {
        if (t.liveStatus !== "streaming") return true;
        console.error("Thread is not settled. Retry later.", {
          threadUuid,
          userId: user._id,
          existingThread: t,
          patch: threadPatch,
        });
        throw new ConvexError(
          "Thread is not allowed to be patched because it is already streaming. Retry later."
        );
      },
    });
    // TODO: could skip runtime validation to save compute
    const validatedMessagesPromise = validateMyUIMessages(uiMessages);

    const [threadId, validatedMessages] = await Promise.all([
      threadIdPromise,
      validatedMessagesPromise,
    ]);

    const thread = await ctx.db.get(threadId);
    if (!thread) throw new ConvexError("FATAL: thread not found");
    if (thread.lifecycleState !== "active")
      throw new ConvexError("FATAL: thread is not active");

    const insertPromises: Promise<unknown>[] = [];

    // also update user preferences if last used model id is set
    if (threadPatch.lastUsedModelId) {
      insertPromises.push(
        INTERNAL_upsertUserChatPreferences(ctx, {
          userId: user._id,
          patch: {
            lastUsedModelId: threadPatch.lastUsedModelId,
          },
        })
      );
    }

    const now = Date.now();
    let bulkOrder = 0;
    for (const uiMessage of validatedMessages) {
      insertPromises.push(
        InternalUpsertMessageWithParts(ctx, {
          userId: user._id,
          threadId,
          uiMessage,
          now,
          bulkOrder: bulkOrder++,
        })
      );
    }
    await Promise.all(insertPromises);

    const messages = await InternalGetAllThreadMessagesAsc(ctx, {
      userId: user._id,
      threadId,
    });

    return {
      thread,
      messages,
    };
  },
});

export const deleteAllMessagesAfter = mutationWithRLS({
  args: {
    threadUuid: vv.doc("threads").fields.uuid,
    messageUuid: vv.doc("messages").fields.uuid,
  },
  async handler(ctx, args) {
    const user = await INTERNAL_getCurrentUserOrThrow(ctx);
    const { threadUuid, messageUuid } = args;
    const thread = await ctx.db
      .query("threads")
      .withIndex("byUserIdUuid", (q) =>
        q.eq("userId", user._id).eq("uuid", threadUuid)
      )
      .unique();
    if (!thread) throw new ConvexError("Thread not found");

    const message = await ctx.db
      .query("messages")
      .withIndex("byUserIdThreadIdUuid", (q) =>
        q
          .eq("userId", user._id)
          .eq("threadId", thread._id)
          .eq("uuid", messageUuid)
      )
      .unique();
    if (!message) throw new ConvexError("Message not found");

    // all messages with createdAt after the message to delete after
    const messagesCreatedAfter1 = await ctx.db
      .query("messages")
      .withIndex("byUserIdThreadIdStateOrdered", (q) =>
        q
          .eq("userId", user._id)
          .eq("threadId", thread._id)
          .eq("lifecycleState", "active")
          .gt("createdAt", message.createdAt)
      )
      .order("asc")
      .collect();

    // all messages within same createdAt chunk, but with higher bulk order
    const messagesCreatedAfter2 = await ctx.db
      .query("messages")
      .withIndex("byUserIdThreadIdStateOrdered", (q) =>
        q
          .eq("userId", user._id)
          .eq("threadId", thread._id)
          .eq("lifecycleState", "active")
          .eq("createdAt", message.createdAt)
          .gt("createdAtBulkOrder", message.createdAtBulkOrder)
      )
      .order("asc")
      .collect();
    const messagesToDelete = [
      ...messagesCreatedAfter1,
      ...messagesCreatedAfter2,
    ];
    await Promise.all(
      messagesToDelete.map((m) =>
        ctx.db.patch(m._id, {
          lifecycleState: "deleted",
          deletedAt: Date.now(),
          updatedAt: Date.now(),
        })
      )
    );
    return;
  },
});

// TODO: (when branching support): we will have to handle this initial intent (regenerate or rewrite) when we support branching because this will change the behavior (different forking point)
// Current state of regeneration (destructive):

/**
 * Continue
 * DB: U1 -> A1
 * REQ: U2
 *
 * case: regenerate A1:
 *  1. Add U2 to DB
 *      DB: U1 -> A1 -> U2
 *  2. Add empty A2 placeholder in DB
 *      DB: U1 -> A1 -> U2 -> A2(empty)
 *  3. Return all history
 *      => U1, A1, U2, A2
 *  (4. generate A2 Response)
 *  5. Update A2 in DB
 *      DB: U1 -> A1 -> U2 -> A2(complete)
 *  6. Update Thread live status
 */

/**
 * Regenerate
 * DB: U1 -> A1 -> U2 -> A2
 *
 * case: regenerate A1:
 * REQ: U1 + intent = 'regenerate'
 *  1. Deduce reset point to be after U1 (because regenerate)
 *  2. Get every messages after U1
 *      => A1, U2, A2
 *  3. Mark all as deleted
 *      DB: U1
 *
 * then call upsertThreadWithNewMessagesAndReturnHistory
 */
