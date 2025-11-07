import { createOptimisticStepStartMessage } from "@ai-monorepo/ai/helpers";
import {
  createMyProviderRegistry,
  modelIdValidator,
} from "@ai-monorepo/ai/model.registry";
import { validateMyUIMessages } from "@ai-monorepo/ai/types/uiMessage";
import { api } from "@ai-monorepo/convex/convex/_generated/api";
import type {
  ChatErrorMetadata,
  LiveStatus,
} from "@ai-monorepo/convex/convex/schema";
import type { LanguageModelV2FinishReason } from "@ai-sdk/provider";
import { implement, ORPCError, streamToEventIterator } from "@orpc/server";
import {
  AISDKError,
  APICallError,
  convertToModelMessages,
  streamText,
  type TextStreamPart,
  type ToolSet,
} from "ai";
import { nanoid } from "nanoid";
import { chatRouterContract } from "../contracts/chat.contract";
import { env } from "../env";
import { clerkAuthMiddleware } from "../libs/middlewares/clerk-auth";
import { convexContextMiddleware } from "../libs/middlewares/convex-helpers";
import type { RequestContext } from "../libs/orpc.context";

const os = implement(chatRouterContract);
export const chatProcedures = os.$context<RequestContext>();

const registry = createMyProviderRegistry({
  GOOGLE_API_KEY: env.GOOGLE_API_KEY,
  OPENAI_API_KEY: env.OPENAI_API_KEY,
});

function generateTitleMock() {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve("Title Mock");
    }, 1000);
  });
}

// TODO: move to utils packages (we can latter publish or add as a shadcn registry)
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function reduceFinishReasonToLiveStatus(
  finishReason: LanguageModelV2FinishReason
): LiveStatus {
  switch (finishReason) {
    case "tool-calls":
      return "streaming";
    case "stop":
      return "completed";
    case "content-filter":
    case "unknown":
    case "length":
    case "other":
    case "error":
      return "error";
    default: {
      return assertNever(finishReason);
    }
  }
}

function reducePartTypeToLiveStatus<T extends ToolSet>(
  type: TextStreamPart<T>["type"]
): LiveStatus {
  switch (type) {
    case "error":
      return "error";
    case "finish":
      return "completed";
    case "abort":
      return "cancelled";
    case "start":
      return "pending";

    case "text-end":
    case "source":
    case "tool-call":
    case "tool-result":
    case "tool-error":
    case "text-start":
    case "text-delta":
    case "reasoning-start":
    case "reasoning-end":
    case "reasoning-delta":
    case "tool-input-start":
    case "tool-input-end":
    case "tool-input-delta":
    case "file":
    case "start-step":
    case "finish-step":
    case "raw":
      return "streaming";
    default: {
      return assertNever(type);
    }
  }
}

function reducePartTypeToErrorMetadata(error: unknown): ChatErrorMetadata {
  // specific AI SDK error
  if (error instanceof APICallError) {
    return {
      kind: "AI_API_ERROR",
      message: error.message,
    };
  }
  // generic AI SDK error
  if (error instanceof AISDKError) {
    return {
      kind: "AI_API_ERROR",
      message: error.message,
    };
  }

  // generic Error
  if (error instanceof Error) {
    return {
      kind: "UNKNOWN_ERROR",
      message: error.message,
    };
  }

  // unknown error
  return {
    kind: "UNKNOWN_ERROR",
    message: "Unknown error",
  };
}

export const chatProcedure = chatProcedures.chat
  .use(clerkAuthMiddleware)
  .use(convexContextMiddleware)
  .handler(async ({ context: { fetchQuery, fetchMutation }, input }) => {
    const __deferredPromises: Promise<unknown>[] = [];

    // 1. Get user
    const user = await fetchQuery(api.users.getCurrentUser);
    if (!user)
      throw new ORPCError("UNAUTHORIZED", {
        message: "User not found",
      });
    // TODO: tmp only allow premium to test in prod. To delete and implement under 3. below
    // TODO: check if user has access to the model
    if (user.tier !== "premium-level-1")
      throw new ORPCError("FORBIDDEN", {
        message: "Only premium users can test regenerate",
        data: {
          userTier: user.tier,
        },
      });

    // 2. Validate inputs
    const validatedUiMessages = await validateMyUIMessages([
      input.lastMessageToKeep,
    ]);
    const modelId = modelIdValidator.parse(input.selectedModelId);
    const isRegenerate = input.trigger === "regenerate-message";
    if (isRegenerate && !input.messageUuid)
      throw new ORPCError("BAD_REQUEST", {
        message: "Message UUID is required for regenerate",
        data: {
          messageUuid: input.messageUuid,
        },
      });
    const newMessageUuid = nanoid();

    // 3. Build data
    const startedAt = Date.now();

    // 4. Load data
    // only when regenerating, we need to delete all messages after the last message to keep
    if (isRegenerate) {
      const lastMessageUuid = validatedUiMessages.at(-1)?.id;
      if (!lastMessageUuid)
        throw new ORPCError("BAD_REQUEST", {
          message: "Last message to keep is required",
          data: {
            lastMessageToKeep: input.lastMessageToKeep,
          },
        });
      await fetchMutation(api.chat.deleteAllMessagesAfter, {
        threadUuid: input.threadUuid,
        messageUuid: lastMessageUuid,
      });
    }

    const optimisticUiMessages = [
      ...validatedUiMessages,
      createOptimisticStepStartMessage(newMessageUuid),
    ];
    const { thread, messages: messagesFromBackend } = await fetchMutation(
      api.chat.upsertThreadWithNewMessagesAndReturnHistory,
      {
        threadUuid: input.threadUuid,
        uiMessages: optimisticUiMessages,
        lastUsedModelId: modelId,
        lifecycleState: "active",
        liveStatus: "streaming",
      }
    );

    // 5. Generate title in background
    if (!thread.title || thread.title.trim() === "") {
      __deferredPromises.push(
        generateTitleMock().then((title) => {
          fetchMutation(api.chat.updateThread, {
            threadId: thread._id,
            title,
          });
        })
      );
    }

    // 6. Start streaming
    const messages = [...messagesFromBackend, ...validatedUiMessages];
    const modelMessages = convertToModelMessages(messages);
    const result = streamText({
      model: registry.languageModel(modelId),
      messages: modelMessages,
    });

    // 7. Consume stream to survive client disconnect
    result.consumeStream(); // no await

    // 8. Create returned stream
    const stream = result.toUIMessageStream({
      originalMessages: messages,
      // Important: reuse same id as optimistic part
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

        // make sure all deferred promises are settled
        await Promise.allSettled(__deferredPromises);

        const lastMessageStatus = isAborted
          ? "cancelled"
          : (responseMessage.metadata?.liveStatus ?? "completed");

        await fetchMutation(api.chat.updateThread, {
          threadId: thread._id,
          liveStatus: lastMessageStatus,
        });

        await fetchMutation(api.chat.upsertMessage, {
          threadId: thread._id,
          uiMessage: responseMessage,
          liveStatus: lastMessageStatus,
        });
      },
      messageMetadata({ part }) {
        // console.log("messageMetadata", part);

        const baseMetadata = {
          updatedAt: Date.now(),
          createdAt: startedAt,
          lifecycleState: "active" as const,
          modelId,
        } as const;

        if (part.type === "error") {
          const errorMetadata = reducePartTypeToErrorMetadata(part.error);
          return {
            ...baseMetadata,
            error: errorMetadata,
            liveStatus: "error" as const,
          };
        }

        const liveStatus = reducePartTypeToLiveStatus(part.type);
        return {
          ...baseMetadata,
          liveStatus,
        };
      },
    });

    return streamToEventIterator(stream);
  });
