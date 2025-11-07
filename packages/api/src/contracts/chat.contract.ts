import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { AsyncIteratorClass } from "@orpc/client";
import { oc, type } from "@orpc/contract";
import type { InferUIMessageChunk } from "ai";

type MyUIMessageChunk = InferUIMessageChunk<MyUIMessage>;

export const chatRouterContract = oc.router({
  chat: oc
    .input(
      type<{
        threadUuid: string;
        messageUuid?: string;
        // when regenerating, it's the previous user message
        // when resubmitting, it's the same as the one pointed by messageUuid
        lastMessageToKeep: MyUIMessage;
        trigger: "regenerate-message" | "submit-message";
        selectedModelId: AllowedModelIds;
      }>()
    )
    // .output(type<ReturnType<typeof streamToEventIterator<MyUIMessageChunk>>>()),
    .output(type<AsyncIteratorClass<MyUIMessageChunk>>()),
});

export type ChatRouterContract = typeof chatRouterContract;
