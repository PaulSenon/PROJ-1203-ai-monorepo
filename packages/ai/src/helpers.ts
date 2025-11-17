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
    metadata: {
      liveStatus: "streaming",
      lifecycleState: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
}
