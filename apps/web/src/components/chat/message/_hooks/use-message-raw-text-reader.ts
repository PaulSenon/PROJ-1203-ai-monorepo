import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useCallback } from "react";
import { useMessagesStoreApi } from "@/hooks/use-message-store";

type MessagePart = MyUIMessage["parts"][number];

export function extractRawTextFromMessageParts(
  parts: readonly MessagePart[]
): string {
  const textParts: string[] = [];

  for (const part of parts) {
    if (part.type !== "text") {
      continue;
    }

    if (typeof part.text !== "string" || part.text.length === 0) {
      continue;
    }

    textParts.push(part.text);
  }

  return textParts.join("\n\n");
}

export function useMessageRawTextReader(messageId: string) {
  const { peekMessageParts } = useMessagesStoreApi();

  const readRawText = useCallback(
    () => extractRawTextFromMessageParts(peekMessageParts(messageId) ?? []),
    [messageId, peekMessageParts]
  );

  return readRawText;
}
