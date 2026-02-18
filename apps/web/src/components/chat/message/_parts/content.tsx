import type { MyUIMessagePart } from "@ai-monorepo/ai/types/uiMessage";
import { ReasoningPart } from "./reasoning-part";
import { TextPart } from "./text-part";

export type MessageContentPartsProps = {
  parts: MyUIMessagePart[];
  reasoningPreviewLines?: number;
};

function getPartKey(part: MyUIMessagePart, index: number) {
  if ("id" in part && part.id) {
    return part.id;
  }

  return `${part.type}-${index}`;
}

export function MessageContentParts({
  parts,
  reasoningPreviewLines,
}: MessageContentPartsProps) {
  return (
    <>
      {parts.map((part, index) => {
        const key = getPartKey(part, index);

        if (part.type === "text") {
          return <TextPart key={key} part={part} />;
        }

        if (part.type === "reasoning") {
          return (
            <ReasoningPart
              key={key}
              part={part}
              previewLines={reasoningPreviewLines}
            />
          );
        }

        return null;
      })}
    </>
  );
}
