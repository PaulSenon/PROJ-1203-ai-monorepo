import type { MyUIMessage } from "./types/uiMessage";

export function createOptimisticStepStartMessage(
  messageUuid: string
): MyUIMessage {
  return {
    id: messageUuid,
    role: "assistant",
    parts: [
      {
        type: "step-start",
      },
    ],
  };
}
