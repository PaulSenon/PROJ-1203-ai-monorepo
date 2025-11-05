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

const metadataSchema = z.object({
  modelId: z.string().optional(),
  updatedAt: z.number(),
  createdAt: z.number(),
  liveStatus: LiveStatus,
  lifecycleState: LifecycleState,
  error: AIErrorMetadata.optional(),
});

export type MetadataSchema = z.infer<typeof metadataSchema>;

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
type DataSchemas = InferUIDataParts<typeof dataSchemas>;

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

export type MyUIMessage = UIMessage<MetadataSchema, DataSchemas, Tools>;
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
