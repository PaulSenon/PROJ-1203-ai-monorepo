import { createUiMessageFromChunks } from "@ai-monorepo/ai/libs/createUiMessageFromChunks";
import type {
  MyUIMessage,
  MyUIMessageChunk,
} from "@ai-monorepo/ai/types/uiMessage";
import { stabilizeMessages } from "./assemble-messages";

type RebuildResumedStreamMessageInput<TStreamId extends string> = {
  streamId: TStreamId;
  chunks: readonly MyUIMessageChunk[];
  previous?: ResumedStreamBuildSnapshot<TStreamId> | null;
};

export type ResumedStreamBuildSnapshot<TStreamId extends string = string> = {
  streamId: TStreamId;
  message: MyUIMessage;
};

export async function rebuildResumedStreamMessage<TStreamId extends string>({
  streamId,
  chunks,
  previous,
}: RebuildResumedStreamMessageInput<TStreamId>): Promise<
  ResumedStreamBuildSnapshot<TStreamId> | null
> {
  if (chunks.length === 0) return null;

  const message = await createUiMessageFromChunks<MyUIMessage>([...chunks]);

  if (!message) return null;

  if (previous?.streamId === streamId) {
    // Rebuild from full chunks for correctness, then reuse refs from the prior
    // same-stream snapshot so unchanged settled prefix content stays stable.
    const stabilizedMessage =
      stabilizeMessages([previous.message], [message], {
        enableDebugDataSource: false,
      })[0] ?? message;

    if (stabilizedMessage === previous.message) {
      return previous;
    }

    return {
      streamId,
      message: stabilizedMessage,
    } satisfies ResumedStreamBuildSnapshot<TStreamId>;
  }

  return {
    streamId,
    message,
  } satisfies ResumedStreamBuildSnapshot<TStreamId>;
}
