import { createUiMessageFromChunks } from "@ai-monorepo/ai/libs/createUiMessageFromChunks";
import type {
  MyUIMessage,
  MyUIMessageChunk,
} from "@ai-monorepo/ai/types/uiMessage";
import { stabilizeMessages } from "./assemble-messages";

export type ResumedStreamBuildSnapshot = {
  streamId: string;
  chunkCount: number;
  message: MyUIMessage;
};

type RebuildResumedStreamMessageInput = {
  streamId: string;
  chunks: readonly MyUIMessageChunk[];
  previous?: ResumedStreamBuildSnapshot | null;
};

export async function rebuildResumedStreamMessage({
  streamId,
  chunks,
  previous,
}: RebuildResumedStreamMessageInput): Promise<ResumedStreamBuildSnapshot | null> {
  if (chunks.length === 0) return null;

  const isSameStream = previous?.streamId === streamId;
  const nextChunks =
    isSameStream && previous.chunkCount <= chunks.length
      ? chunks.slice(previous.chunkCount)
      : chunks;

  if (isSameStream && nextChunks.length === 0) {
    return previous;
  }

  const seedMessage =
    isSameStream && previous.chunkCount <= chunks.length
      ? structuredClone(previous.message)
      : undefined;

  const replayChunks =
    seedMessage && previous
      ? [
          // AI SDK continuation still needs the matching open-part starts.
          ...collectContinuationPrefixChunks(chunks, previous.chunkCount),
          ...nextChunks,
        ]
      : nextChunks;

  const message = await createUiMessageFromChunks<MyUIMessage>(
    [...replayChunks],
    seedMessage
      ? {
          uiMessage: seedMessage,
        }
      : undefined
  );

  if (!message) return null;

  const stabilizedMessage =
    isSameStream
      // Preserve settled prefix refs while letting the changing tail update.
      ? stabilizeMessages([previous.message], [message], {
          enableDebugDataSource: false,
        })[0] ?? message
      : message;

  return {
    streamId,
    chunkCount: chunks.length,
    message: stabilizedMessage,
  } satisfies ResumedStreamBuildSnapshot;
}

function collectContinuationPrefixChunks(
  chunks: readonly MyUIMessageChunk[],
  boundary: number
) {
  const openPartStarts = new Map<string, MyUIMessageChunk>();

  for (const chunk of chunks.slice(0, boundary)) {
    if (chunk.type === "text-start" || chunk.type === "reasoning-start") {
      openPartStarts.set(chunk.id, chunk);
      continue;
    }

    if (chunk.type === "text-end" || chunk.type === "reasoning-end") {
      openPartStarts.delete(chunk.id);
    }
  }

  const requiredOpenPartIds = new Set<string>();
  for (const chunk of chunks.slice(boundary)) {
    if (
      (chunk.type === "text-delta" || chunk.type === "text-end") &&
      openPartStarts.has(chunk.id)
    ) {
      requiredOpenPartIds.add(chunk.id);
      continue;
    }

    if (
      (chunk.type === "reasoning-delta" || chunk.type === "reasoning-end") &&
      openPartStarts.has(chunk.id)
    ) {
      requiredOpenPartIds.add(chunk.id);
    }
  }

  return [...openPartStarts.entries()]
    .filter(([partId]) => requiredOpenPartIds.has(partId))
    .map(([, chunk]) => chunk);
}
