import { createUiMessageFromChunks } from "@ai-monorepo/ai/libs/createUiMessageFromChunks";
import type {
  MyUIMessage,
  MyUIMessageChunk,
} from "@ai-monorepo/ai/types/uiMessage";

export type ResumedStreamBuildSnapshot = {
  streamId: string;
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
}: RebuildResumedStreamMessageInput): Promise<ResumedStreamBuildSnapshot | null> {
  if (chunks.length === 0) return null;

  const message = await createUiMessageFromChunks<MyUIMessage>([...chunks]);

  if (!message) return null;

  return {
    streamId,
    message,
  } satisfies ResumedStreamBuildSnapshot;
}
