export type ResumedStreamedMessageState<TStreamId, TMessage> = {
  streamId: TStreamId;
  message: TMessage;
};

export function canBuildResumedStreamedMessage<TStreamId, TChunk>({
  isSkip,
  streamId,
  throttledMessageChunks,
}: {
  isSkip: boolean;
  streamId: TStreamId | null;
  throttledMessageChunks: TChunk[] | "skip" | undefined;
}) {
  return (
    !isSkip &&
    streamId !== null &&
    throttledMessageChunks !== undefined &&
    throttledMessageChunks !== "skip" &&
    throttledMessageChunks.length > 0
  );
}

export async function reconstructResumedStreamedMessage<
  TStreamId,
  TChunk,
  TMessage,
>({
  streamId,
  throttledMessageChunks,
  buildMessage,
}: {
  streamId: TStreamId | null;
  throttledMessageChunks: TChunk[] | "skip" | undefined;
  buildMessage: (chunks: TChunk[]) => Promise<TMessage | undefined>;
}): Promise<ResumedStreamedMessageState<TStreamId, TMessage> | null> {
  if (!streamId || throttledMessageChunks === undefined) {
    return null;
  }

  if (
    throttledMessageChunks === "skip" ||
    throttledMessageChunks.length === 0
  ) {
    return null;
  }

  const message = await buildMessage(throttledMessageChunks);
  if (!message) return null;

  return {
    streamId,
    message,
  };
}

export function selectResumedMessages<TStreamId, TMessage>({
  isSkip,
  streamId,
  streamIsPending,
  streamed,
}: {
  isSkip: boolean;
  streamId: TStreamId | null;
  streamIsPending: boolean;
  streamed: ResumedStreamedMessageState<TStreamId, TMessage> | null;
}) {
  const activeStreamedMessage =
    streamed?.streamId === streamId ? streamed.message : undefined;

  return {
    messages:
      streamIsPending || activeStreamedMessage === undefined || isSkip
        ? []
        : [activeStreamedMessage],
    isPending: isSkip
      ? false
      : streamId !== null &&
        (streamIsPending || activeStreamedMessage === undefined),
  };
}
