import {
  type InferUIDataParts,
  type InferUIMessageChunk,
  type InferUITools,
  tool,
  type UIMessage,
  validateUIMessages,
} from "ai";
import z from "zod";

export const MessageError = z.union([
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
]);
export type MessageError = z.infer<typeof MessageError>;
export type MessageErrorKind = MessageError["kind"];

export const LiveStatus = z.enum([
  "pending",
  "streaming",
  "completed",
  "cancelled",
  "error",
]);
export type LiveStatus = z.infer<typeof LiveStatus>;

export const LifecycleState = z.enum(["active", "archived", "deleted"]);
export type LifecycleState = z.infer<typeof LifecycleState>;

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

// This is for UI debug purpose. To indicate where the data is coming from.
export const MessageDataSource = z.enum([
  "cache",
  "convex-persisted",
  "optimistic",
  "convex-stream",
  "http-stream",
]);
export type MessageDataSource = z.infer<typeof MessageDataSource>;

export const MyUIMessageDebug = z.object({
  dataSource: MessageDataSource.optional(),
});

const metadataSchema = z.object({
  modelId: z.string().optional(),
  updatedAt: z.number(),
  createdAt: z.number(),
  liveStatus: LiveStatus,
  lifecycleState: LifecycleState,
  error: MessageError.optional(),
  timing: MyUIMessageTimingStats.optional(),
  usage: MyUIMessageTokenUsage.optional(),
  debug: MyUIMessageDebug.optional(),
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
export function messageTiming(metadata: MyUIMessageMetadata | undefined) {
  return new MyMetadataHelper(metadata);
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
export type MyUIMessagePart = MyUIMessage["parts"][number];
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
