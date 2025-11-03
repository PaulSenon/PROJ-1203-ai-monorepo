import {
  createMyProviderRegistry,
  modelIdValidator,
} from "@ai-monorepo/ai/model.registry";
import { validateMyUIMessages } from "@ai-monorepo/ai/types/uiMessage";
import { api } from "@ai-monorepo/convex/convex/_generated/api";
import { implement, ORPCError, streamToEventIterator } from "@orpc/server";
import { convertToModelMessages, streamText } from "ai";
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

export const chatProcedure = chatProcedures.chat
  .use(clerkAuthMiddleware)
  .use(convexContextMiddleware)
  .handler(async ({ context: { fetchQuery, fetchMutation }, input }) => {
    const __deferredPromises: Promise<unknown>[] = [];

    // 1. Get user
    const user = await fetchQuery(api.users.getCurrentUser);
    if (!user) throw new ORPCError("UNAUTHORIZED");

    // 2. Validate inputs
    const validatedUiMessages = await validateMyUIMessages([input.message]);

    // 3. Build data
    const modelId = modelIdValidator.parse(input.selectedModelId);
    // TODO: check if user has access to the model

    // 4. Load data
    const messagesWithOptimisticStepStart = [
      ...validatedUiMessages,
      // createOptimisticStepStartMessage(),
    ];
    const { thread, messages: messagesFromBackend } = await fetchMutation(
      api.chat.upsertThreadWithNewMessagesAndReturnHistory,
      {
        threadUuid: input.uuid,
        uiMessages: messagesWithOptimisticStepStart,
        lastUsedModelId: input.selectedModelId,
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
      generateMessageId: () => nanoid(),
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

        await fetchMutation(api.chat.upsertMessage, {
          threadId: thread._id,
          uiMessage: responseMessage,
          liveStatus: isAborted ? "cancelled" : "completed",
        });

        await fetchMutation(api.chat.updateThread, {
          threadId: thread._id,
          liveStatus: isAborted ? "cancelled" : "completed",
        });
      },
    });

    return streamToEventIterator(stream);
  });
