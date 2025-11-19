import {
  type InferUIMessageChunk,
  readUIMessageStream,
  type UIMessage,
} from "ai";

export async function createUiMessageFromChunks<T extends UIMessage>(
  chunks: InferUIMessageChunk<T>[],
  options?: {
    uiMessage?: T;
  }
) {
  const { uiMessage } = options ?? {};

  // 1. recreate a stream out of the chunk array because readUIMessageStream expects a stream
  const chunksStream = new ReadableStream<InferUIMessageChunk<T>>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  let error: unknown;
  // 2. get the UIMessage stream from the chunks
  const messageStream = readUIMessageStream({
    message: uiMessage,
    stream: chunksStream,
    onError: (e) => {
      error = e;
      console.error("Error in stream", e);
    },
    terminateOnError: true,
  });

  // 3. reconstruct the UIMessage from the stream
  let message = uiMessage;
  for await (const messagePart of messageStream) {
    if (message && messagePart.id !== message.id) {
      throw new Error(
        `Expecting to only make one UIMessage in a stream, but have ${JSON.stringify(message)} and created ${JSON.stringify(messagePart)}`
      );
    }
    message = messagePart;
  }

  if (error) {
    throw new Error("Error in stream", { cause: error });
  }

  return message;
}
