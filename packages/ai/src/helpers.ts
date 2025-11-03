import type { MyUIMessage } from "./types/uiMessage";

export function createOptimisticStepStartMessage(): MyUIMessage {
  return {
    id: Date.now().toString(),
    role: "assistant",
    parts: [
      {
        type: "step-start",
      },
    ],
  };
}
