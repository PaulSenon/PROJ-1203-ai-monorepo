import type { AsyncIterableStream, UIMessageChunk } from "ai";

type Delta<T extends UIMessageChunk> = {
  start: number;
  end: number;
  chunks: T[];
};
type DeltaSaverOptions = {
  chunking?: RegExp;
  throttleMs: number;
  compress: boolean;
};
const DEFAULT_DELTA_SAVER_OPTIONS = {
  // This chunks by sentences / clauses. Punctuation followed by whitespace.
  chunking: /[\p{P}\s]/u,
  throttleMs: 250,
  compress: true,
} satisfies DeltaSaverOptions;

type MaybePromise<T> = T | Promise<T>;
type DeltaSaverArgs<T extends UIMessageChunk> = {
  config?: DeltaSaverOptions;
  onDelta?: (delta: Delta<T>) => MaybePromise<void>;
  onFinish?: (args: {
    reason: "finish" | "abort" | "error";
  }) => MaybePromise<void>;
  onError?: (error: Error) => MaybePromise<void>;
};
/**
 * This is HIGHLY inspired by convex agents component (https://github.com/get-convex/agent)
 * Just rewrote in a way if fits my needs.
 * @copyright: https://github.com/get-convex/agent/blob/28f3117648d646f35b2c335788e8da8860d3b879/src/client/streaming.ts
 * @license: https://github.com/get-convex/agent/blob/ef514dd6b4b6ad33a91e03fb45c40371bbb437e5/LICENSE
 */
export class DeltaStreamChunker<T extends UIMessageChunk> {
  private nextChunks: T[] = [];

  private cursor = 0;
  private lastFlush = 0; // To force immediate first chunk flush on start
  private ongoingFlush: Promise<void> = Promise.resolve();
  private isFinished = false;
  private lastMetadataChunk: (T & { type: "message-metadata" }) | undefined;

  private readonly config: DeltaSaverOptions;
  private readonly handlePersistDelta: DeltaSaverArgs<T>["onDelta"];
  private readonly handleFinish: DeltaSaverArgs<T>["onFinish"];
  private readonly handleError: DeltaSaverArgs<T>["onError"];

  readonly abortController: AbortController;

  constructor(params: DeltaSaverArgs<T>) {
    this.config = params.config ?? DEFAULT_DELTA_SAVER_OPTIONS;
    this.handlePersistDelta = params.onDelta;
    this.handleFinish = params.onFinish;
    this.handleError = params.onError;
    this.abortController = new AbortController();
    this.abortController.signal.addEventListener("abort", () => {
      this.abort();
    });
  }

  private async addChunk(chunk: T): Promise<void> {
    this.nextChunks.push(chunk);
    if (!this.canFlush()) return;
    await this.flush();
  }

  async consumeStream(stream: AsyncIterableStream<T>) {
    try {
      for await (const chunk of stream) {
        await this.addChunk(chunk);
      }
    } catch (error) {
      await this.fail(new Error("Error consuming stream", { cause: error }));
    }
    await this.finish();
  }

  private async finish(): Promise<void> {
    if (this.isFinished) return;
    if (this.abortController.signal.aborted) return;

    this.isFinished = true; // prevent abort & fail
    await this.flush();
    await this.handleFinish?.({ reason: "finish" });
  }

  async fail(error: Error) {
    if (this.isFinished) return;
    if (this.abortController.signal.aborted) return;

    this.abortController.abort(); // prevent finish & abort
    await this.ongoingFlush;
    await this.handleError?.(error);
    await this.handleFinish?.({ reason: "error" });
  }

  async abort(): Promise<void> {
    if (this.isFinished) return;
    if (this.abortController.signal.aborted) return;

    this.abortController.abort(); // prevent finish & fail
    await this.ongoingFlush;
    await this.handleFinish?.({ reason: "abort" });
  }

  private async flush(): Promise<void> {
    // wait previous flush
    await this.ongoingFlush;

    this.ongoingFlush = (async () => {
      if (this.nextChunks.length === 0) return;
      const delta = this.createDelta();
      this.lastFlush = Date.now();
      try {
        await this.handlePersistDelta?.(delta);
      } catch (error) {
        await this.fail(new Error("Error persisting delta", { cause: error }));
      }
    })();

    await this.ongoingFlush;
  }

  private createDelta(): Delta<T> {
    const start = this.cursor;
    const end = start + this.nextChunks.length;
    this.cursor = end;
    const chunks = this.config.compress
      ? this.compressChunks(this.nextChunks)
      : this.nextChunks;
    this.nextChunks = [];
    return { start, end, chunks };
  }

  private compressChunks(chunks: T[]): T[] {
    // 1. compress text chunks
    const compressed = compressUIMessageChunks(chunks);

    // 2. filter out non-changing metadata chunks
    const lastMetadataChunkInDelta = compressed.findLast(
      (chunk): chunk is T & { type: "message-metadata" } =>
        chunk.type === "message-metadata"
    );
    if (!lastMetadataChunkInDelta) return compressed;
    const hasMetadataChangedSinceLastChunk =
      JSON.stringify(lastMetadataChunkInDelta) !==
      JSON.stringify(this.lastMetadataChunk);

    // if changed, we remove all but the last metadata chunk
    if (hasMetadataChangedSinceLastChunk) {
      this.lastMetadataChunk = lastMetadataChunkInDelta;
      return [
        ...compressed.filter((chunk) => chunk.type !== "message-metadata"),
        lastMetadataChunkInDelta,
      ];
    }

    // if not changed, we remove all metadata chunks in delta
    return compressed.filter((chunk) => chunk.type !== "message-metadata");
  }

  private canFlush(): boolean {
    if (this.abortController.signal.aborted) return false;

    const hasNoPendingChunks = this.nextChunks.length === 0;
    if (hasNoPendingChunks) return false;

    const timeSinceLastFlush = Date.now() - this.lastFlush;
    const isThrottled = timeSinceLastFlush < this.config.throttleMs;
    if (isThrottled) return false;

    const lastCompressedChunk = compressUIMessageChunks(this.nextChunks).at(-1);
    const isTextDelta =
      lastCompressedChunk?.type === "text-delta" ||
      lastCompressedChunk?.type === "reasoning-delta";
    if (!isTextDelta) return true; // always flush non-text-like chunks

    if (!this.config.chunking) return true;
    const isChunkMatching = this.config.chunking.test(
      lastCompressedChunk.delta
    );
    return isChunkMatching; // flush if chunk matches chunking regex
  }
}

export function compressUIMessageChunks<T extends UIMessageChunk>(
  chunks: T[]
): T[] {
  const compressed: T[] = [];
  for (const chunk of chunks) {
    const last = compressed.at(-1);
    if (chunk.type === "text-delta" || chunk.type === "reasoning-delta") {
      if (last?.type === chunk.type && chunk.id === last.id) {
        last.delta += chunk.delta;
      } else {
        compressed.push(chunk);
      }
    } else {
      compressed.push(chunk);
    }
  }
  return compressed;
}
