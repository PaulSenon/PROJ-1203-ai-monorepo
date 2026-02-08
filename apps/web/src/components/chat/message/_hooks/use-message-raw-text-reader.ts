import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useCallback, useRef } from "react";

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

export function useMessageRawTextReader(parts: MyUIMessage["parts"]) {
  const partsRef = useRef(parts);
  partsRef.current = parts;

  const readRawText = useCallback(
    () => extractRawTextFromMessageParts(partsRef.current),
    []
  );

  return readRawText;
}
