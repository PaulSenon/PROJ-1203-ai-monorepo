import type {
  ChatErrorKind,
  ChatErrorMetadata,
  LifecycleState as ConvexLifecycleState,
  LiveStatus as ConvexLiveStatus,
} from "@ai-monorepo/convex/convex/schema";
import type { StandardSchemaV1 } from "@t3-oss/env-core";
import {
  type InferUIDataParts,
  type InferUIMessageChunk,
  type InferUITools,
  tool,
  type UIMessage,
  validateUIMessages,
} from "ai";
import z from "zod";

export const AIErrorKind = z.enum([
  "AI_API_ERROR",
  "UNKNOWN_ERROR",
  "MAX_OUTPUT_TOKENS_EXCEEDED",
]) satisfies StandardSchemaV1<ChatErrorKind>;

export const AIErrorMetadata = z.union([
  z.object({
    kind: z.literal("AI_API_ERROR"),
    message: z.string().optional(),
  }),
  z.object({
    kind: z.literal("UNKNOWN_ERROR"),
    message: z.string().optional(),
  }),
  z.object({
    kind: z.literal("MAX_OUTPUT_TOKENS_EXCEEDED"),
    params: z.object({
      maxOutputTokens: z.number().optional(),
      retryWithSuggestedModelIds: z.array(z.string()).optional(),
    }),
    message: z.string().optional(),
  }),
]) satisfies StandardSchemaV1<ChatErrorMetadata>;

export const LiveStatus = z.enum([
  "pending",
  "streaming",
  "completed",
  "cancelled",
  "error",
]) satisfies StandardSchemaV1<ConvexLiveStatus>;

export const LifecycleState = z.enum([
  "active",
  "archived",
  "deleted",
]) satisfies StandardSchemaV1<ConvexLifecycleState>;

// time to first token = firstTokenReceivedAt - userSubmittedAt
// time to first meaningful token = firstContentTokenReceivedAt - userSubmittedAt
// thinking duration = lastThinkingTokenReceivedAt - firstThinkingTokenReceivedAt
// token per second = totalTokens / (lastTokenReceivedAt - userSubmittedAt)
export const MyUIMessageTimingStats = z.object({
  userSubmittedAt: z.number().optional(),
  firstThinkingTokenReceivedAt: z.number().optional(),
  firstContentTokenReceivedAt: z.number().optional(),
  firstTokenReceivedAt: z.number().optional(),
  lastTokenReceivedAt: z.number().optional(),
  lastContentTokenReceivedAt: z.number().optional(),
  lastThinkingTokenReceivedAt: z.number().optional(),
});
export const MyUIMessageTokenUsage = z.object({
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  totalTokens: z.number().optional(),
  reasoningTokens: z.number().optional(),
  cachedInputTokens: z.number().optional(),
});

const metadataSchema = z.object({
  modelId: z.string().optional(),
  updatedAt: z.number(),
  createdAt: z.number(),
  liveStatus: LiveStatus,
  lifecycleState: LifecycleState,
  error: AIErrorMetadata.optional(),
  timing: MyUIMessageTimingStats.optional(),
  usage: MyUIMessageTokenUsage.optional(),
});

export type MyUIMessageMetadata = z.infer<typeof metadataSchema>;
export class MyMetadataHelper {
  readonly #metadata: MyUIMessageMetadata | undefined;
  constructor(metadata: MyUIMessageMetadata | undefined) {
    this.#metadata = metadata ?? undefined;
  }

  get timeToFirstToken() {
    const userSubmittedAt = this.#metadata?.timing?.userSubmittedAt;
    const firstTokenReceivedAt = this.#metadata?.timing?.firstTokenReceivedAt;

    if (userSubmittedAt === undefined) return undefined;
    if (firstTokenReceivedAt === undefined) return undefined;
    if (userSubmittedAt > firstTokenReceivedAt) return undefined;

    return firstTokenReceivedAt - userSubmittedAt;
  }

  get timeToFirstMeaningfulToken() {
    const userSubmittedAt = this.#metadata?.timing?.userSubmittedAt;
    const firstContentTokenReceivedAt =
      this.#metadata?.timing?.firstContentTokenReceivedAt;

    if (userSubmittedAt === undefined) return undefined;
    if (firstContentTokenReceivedAt === undefined) return undefined;
    if (userSubmittedAt > firstContentTokenReceivedAt) return undefined;

    return firstContentTokenReceivedAt - userSubmittedAt;
  }

  get thinkingDuration() {
    const firstThinkingTokenReceivedAt =
      this.#metadata?.timing?.firstThinkingTokenReceivedAt;
    const lastThinkingTokenReceivedAt =
      this.#metadata?.timing?.lastThinkingTokenReceivedAt;

    if (firstThinkingTokenReceivedAt === undefined) return undefined;
    if (lastThinkingTokenReceivedAt === undefined) return undefined;
    if (firstThinkingTokenReceivedAt > lastThinkingTokenReceivedAt)
      return undefined;

    return lastThinkingTokenReceivedAt - firstThinkingTokenReceivedAt;
  }

  get tokenPerSecond() {
    const lastTokenReceivedAt = this.#metadata?.timing?.lastTokenReceivedAt;
    const userSubmittedAt = this.#metadata?.timing?.userSubmittedAt;
    const totalTokens = this.#metadata?.usage?.totalTokens;

    if (lastTokenReceivedAt === undefined) return undefined;
    if (userSubmittedAt === undefined) return undefined;
    if (totalTokens === undefined) return undefined;
    if (lastTokenReceivedAt < userSubmittedAt) return undefined;
    if (totalTokens === 0) return 0;
    if (lastTokenReceivedAt - userSubmittedAt === 0)
      return Number.POSITIVE_INFINITY;

    return totalTokens / (lastTokenReceivedAt - userSubmittedAt);
  }
}

const dataSchemas = {
  chart: z.object({
    data: z.array(z.number()),
    labels: z.array(z.string()),
  }),
  image: z.object({
    url: z.url(),
    caption: z.string(),
  }),
};
type MyUIMessageDataSchemas = InferUIDataParts<typeof dataSchemas>;

const tools = {
  weather: tool({
    description: "Get weather info",
    inputSchema: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => `Weather in ${location}: sunny`,
  }),
};
type Tools = InferUITools<typeof tools>;

export type MyUIMessage = UIMessage<
  MyUIMessageMetadata,
  MyUIMessageDataSchemas,
  Tools
>;
export type MyUIMessageChunk = InferUIMessageChunk<MyUIMessage>;
export async function validateMyUIMessages(messages: unknown[]) {
  return validateUIMessages<MyUIMessage>({ messages });
  // TODO: fix this, validation is not working
  // return validateUIMessages<MyUIMessage>({
  //   messages,
  //   metadataSchema,
  //   dataSchemas,
  //   tools,
  // });
}
