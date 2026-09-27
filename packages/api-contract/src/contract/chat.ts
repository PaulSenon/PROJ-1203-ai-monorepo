import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import type {
  MyUIMessage,
  MyUIMessageChunk,
} from "@ai-monorepo/ai/types/uiMessage";
import type { AsyncIteratorClass } from "@orpc/client";
import { oc, type } from "@orpc/contract";

export const chatProcedureContract = oc
  .input(
    type<{
      threadUuid: string;
      // messageUuid?: string; // no longer used ??
      nextMessageUuid?: string;
      // when regenerating, it's the previous user message
      // when resubmitting, it's the same as the one pointed by messageUuid
      lastMessageToKeep: MyUIMessage;
      trigger: "regenerate-message" | "submit-message";
      selectedModelId: AllowedModelIds;
    }>()
  )
  // .output(type<ReturnType<typeof streamToEventIterator<MyUIMessageChunk>>>()),
  .output(type<AsyncIteratorClass<MyUIMessageChunk>>())
  .errors({
    // TODO: typed error
    // INVALID_CLIENT_SIDE_UUID: {
    //   data: z.object({
    //     fallbackUuid: z.string(),
    //   }),
    //   message: "client-side generated id has been rejected by server",
    //   status: 400,
    // },
  });

export type ChatProcedureContract = typeof chatProcedureContract;
