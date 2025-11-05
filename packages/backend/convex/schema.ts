import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { typedV } from "convex-helpers/validators";

export const subscriptionTiers = v.union(
  v.literal("free"),
  v.literal("premium-level-1")
);
export type SubscriptionTier = typeof subscriptionTiers.type;

export const lifecycleStates = v.union(
  v.literal("active"),
  v.literal("archived"),
  v.literal("deleted")
);
export type LifecycleState = typeof lifecycleStates.type;

export const liveStatuses = v.union(
  v.literal("pending"),
  v.literal("streaming"),
  v.literal("completed"),
  v.literal("error"),
  v.literal("cancelled")
);
export type LiveStatus = typeof liveStatuses.type;

export const chatErrorMetadata = v.union(
  v.object({
    kind: v.literal("AI_API_ERROR"),
    message: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("UNKNOWN_ERROR"),
    message: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("MAX_OUTPUT_TOKENS_EXCEEDED"),
    params: v.object({
      maxOutputTokens: v.optional(v.number()),
      retryWithSuggestedModelIds: v.optional(v.array(v.string())),
    }),
    message: v.optional(v.string()),
  })
);
export type ChatErrorMetadata = typeof chatErrorMetadata.type;
export type ChatErrorKind = ChatErrorMetadata["kind"];

export const flexibleMetadata = v.record(v.string(), v.any());

const schema = defineSchema({
  users: defineTable({
    // Clerk user ID (from getUserIdentity().subject)
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    tier: subscriptionTiers,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byTokenIdentifier", ["tokenIdentifier"])
    .index("byEmail", ["email"]),

  threads: defineTable({
    userId: v.id("users"),
    uuid: v.string(),
    title: v.optional(v.string()),
    lifecycleState: lifecycleStates,
    liveStatus: liveStatuses,
    createdAt: v.number(),
    updatedAt: v.number(),
    lastUsedModelId: v.optional(v.string()),
  })
    .index("byUserId", ["userId"])
    .index("byUserIdStateUpdatedAt", ["userId", "lifecycleState", "updatedAt"])
    .index("byUserIdUuid", ["userId", "uuid"]),

  drafts: defineTable({
    userId: v.id("users"),
    threadId: v.id("threads"),
    data: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("byUserIdThreadId", ["userId", "threadId"]),

  // threadMetadata: defineTable({}),

  messages: defineTable({
    userId: v.id("users"),
    threadId: v.id("threads"),
    uuid: v.string(),
    role: v.string(),
    lifecycleState: lifecycleStates,
    liveStatus: liveStatuses,
    createdAt: v.number(),
    updatedAt: v.number(),
    modelId: v.optional(v.string()),
    error: v.optional(chatErrorMetadata),
  })
    .index("byUserIdThreadIdUuid", ["userId", "threadId", "uuid"])
    .index("byUserIdThreadIdCreatedAt", ["userId", "threadId", "createdAt"]),

  // 'json' => string => JSON.parse / JSON.stringify
  // 'msgpack' => bytes => pack / unpack
  // 'cvxstorage' =>
  messageParts: defineTable({
    userId: v.id("users"),
    messageId: v.id("messages"),
    encodedParts: v.union(
      v.object({
        source: v.literal("inline"),
        encoding: v.literal("json"),
        data: v.string(),
      }),
      v.object({
        source: v.literal("inline"),
        encoding: v.literal("msgpack"),
        data: v.bytes(),
      }),
      v.object({
        source: v.literal("cvxstorage"),
        encoding: v.literal("msgpack"),
        ref: v.id("_storage"),
      })
    ),
  }).index("byUserIdMessageId", ["userId", "messageId"]),
});

export const vv = typedV(schema);

export default schema;
