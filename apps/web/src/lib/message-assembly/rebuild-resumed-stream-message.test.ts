import type {
  MyUIMessage,
  MyUIMessageChunk,
} from "@ai-monorepo/ai/types/uiMessage";
import { describe, expect, it, vi } from "vitest";

import { rebuildResumedStreamMessage } from "./rebuild-resumed-stream-message";

vi.mock("@ai-monorepo/ai/libs/createUiMessageFromChunks", () => ({
  createUiMessageFromChunks: vi.fn(
    async (
      chunks: MyUIMessageChunk[],
      options?: {
        uiMessage?: MyUIMessage;
      }
    ) => {
      const partIndexByChunkId = new Map<string, number>();
      const message: MyUIMessage =
        structuredClone(options?.uiMessage) ?? {
          id: "message-1",
          role: "assistant",
          metadata: {
            createdAt: 1,
            updatedAt: 1,
            liveStatus: "streaming",
            lifecycleState: "active",
          },
          parts: [],
        };

      const seededReasoningIndex = message.parts.findIndex(
        (part) => part.type === "reasoning"
      );
      if (seededReasoningIndex !== -1) {
        partIndexByChunkId.set("reasoning-1", seededReasoningIndex);
      }

      const seededTextIndex = message.parts.findIndex(
        (part) => part.type === "text"
      );
      if (seededTextIndex !== -1) {
        partIndexByChunkId.set("text-1", seededTextIndex);
      }

      for (const chunk of chunks) {
        if (chunk.type === "start") {
          message.id = chunk.messageId ?? message.id;
          message.metadata = chunk.messageMetadata ?? message.metadata;
          continue;
        }

        if (chunk.type === "reasoning-start") {
          if (!partIndexByChunkId.has(chunk.id)) {
            partIndexByChunkId.set(chunk.id, message.parts.length);
            message.parts.push({
              type: "reasoning",
              text: "",
              state: "streaming",
            });
          }
          continue;
        }

        if (chunk.type === "reasoning-delta") {
          const partIndex = partIndexByChunkId.get(chunk.id);
          const part = partIndex === undefined ? undefined : message.parts[partIndex];

          if (part?.type === "reasoning") {
            part.text = `${part.text ?? ""}${chunk.delta}`;
          }
          continue;
        }

        if (chunk.type === "reasoning-end") {
          const partIndex = partIndexByChunkId.get(chunk.id);
          const part = partIndex === undefined ? undefined : message.parts[partIndex];

          if (part?.type === "reasoning") {
            part.state = "done";
          }
          continue;
        }

        if (chunk.type === "text-start") {
          if (!partIndexByChunkId.has(chunk.id)) {
            partIndexByChunkId.set(chunk.id, message.parts.length);
            message.parts.push({
              type: "text",
              text: "",
              state: "streaming",
            });
          }
          continue;
        }

        if (chunk.type === "text-delta") {
          const partIndex = partIndexByChunkId.get(chunk.id);
          const part = partIndex === undefined ? undefined : message.parts[partIndex];

          if (part?.type === "text") {
            part.text = `${part.text ?? ""}${chunk.delta}`;
          }
          continue;
        }

        if (chunk.type === "text-end") {
          const partIndex = partIndexByChunkId.get(chunk.id);
          const part = partIndex === undefined ? undefined : message.parts[partIndex];

          if (part?.type === "text") {
            part.state = "done";
          }
        }
      }

      return message;
    }
  ),
}));

function makeStreamingChunks(textDeltas: string[]): MyUIMessageChunk[] {
  return [
    {
      type: "start",
      messageId: "message-1",
      messageMetadata: {
        createdAt: 1,
        updatedAt: 1,
        liveStatus: "streaming",
        lifecycleState: "active",
      },
    },
    {
      type: "reasoning-start",
      id: "reasoning-1",
    },
    {
      type: "reasoning-delta",
      id: "reasoning-1",
      delta: "plan",
    },
    {
      type: "reasoning-end",
      id: "reasoning-1",
    },
    {
      type: "text-start",
      id: "text-1",
    },
    ...textDeltas.map((delta) =>
      ({
        type: "text-delta",
        id: "text-1",
        delta,
      }) satisfies MyUIMessageChunk
    ),
  ];
}

describe("rebuildResumedStreamMessage", () => {
  it("returns null for empty chunk input", async () => {
    await expect(
      rebuildResumedStreamMessage({ streamId: "stream-1", chunks: [] })
    ).resolves.toBeNull();
  });

  it("reuses prior built state for the same stream lifecycle", async () => {
    const first = await rebuildResumedStreamMessage({
      streamId: "stream-1",
      chunks: makeStreamingChunks(["hel"]),
    });

    expect(first).not.toBeNull();

    const next = await rebuildResumedStreamMessage({
      streamId: "stream-1",
      chunks: makeStreamingChunks(["hel", "lo"]),
      previous: first,
    });

    expect(next).not.toBeNull();
    expect(next?.message.parts[0]).toBe(first?.message.parts[0]);
    expect(next?.message.parts[1]).not.toBe(first?.message.parts[1]);
    expect(next?.message.parts[1]).toMatchObject({ type: "text", text: "hello" });
    expect(next?.chunkCount).toBe(7);
  });

  it("resets reuse when stream identity changes", async () => {
    const first = await rebuildResumedStreamMessage({
      streamId: "stream-1",
      chunks: makeStreamingChunks(["hel"]),
    });

    const next = await rebuildResumedStreamMessage({
      streamId: "stream-2",
      chunks: makeStreamingChunks(["hel", "lo"]),
      previous: first,
    });

    expect(next).not.toBeNull();
    expect(next?.message.parts[0]).not.toBe(first?.message.parts[0]);
    expect(next?.chunkCount).toBe(7);
  });
});
