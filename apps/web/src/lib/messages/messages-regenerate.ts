import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";

export type RegenerateMessageSelection = {
  anchorMessageId: string;
  anchorMessage: MyUIMessage;
  messagesToDelete: string[];
};

export function createRegeneratePlan({
  targetMessageId,
  orderedIds,
  getRole,
  getMessage,
}: {
  targetMessageId: string;
  orderedIds: string[];
  getRole: (messageId: string) => MyUIMessage["role"] | undefined;
  getMessage: (messageId: string) => MyUIMessage | undefined;
}): RegenerateMessageSelection | null {
  let targetIndex = orderedIds.indexOf(targetMessageId);
  if (targetIndex === -1) return null;

  while (
    targetIndex > 0 &&
    getRole(orderedIds[targetIndex] ?? "") === "assistant"
  ) {
    targetIndex -= 1;
  }

  const anchorMessageId = orderedIds[targetIndex];
  if (!anchorMessageId) return null;

  const anchorMessage = getMessage(anchorMessageId);
  if (!anchorMessage || anchorMessage.role !== "user") {
    return null;
  }

  return {
    anchorMessageId,
    anchorMessage,
    messagesToDelete: orderedIds.slice(targetIndex + 1),
  };
}
