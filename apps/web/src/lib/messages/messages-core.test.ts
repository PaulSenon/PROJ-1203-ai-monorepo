import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { describe, expect, it } from "vitest";
import {
  diffCanonicalMessages,
  mergeMessageLayers,
  normalizeCanonicalMessages,
  normalizeMessages,
} from "./messages-core";

function createMessage(
  id: string,
  options?: Partial<MyUIMessage>
): MyUIMessage {
  const createdAt = Number(id) * 100;

  return {
    id,
    role: options?.role ?? "assistant",
    metadata: {
      createdAt,
      updatedAt: createdAt,
      liveStatus: "completed",
      lifecycleState: "active",
      ...options?.metadata,
    },
    parts: options?.parts ?? [{ type: "text", text: `message-${id}` }],
  };
}

describe("mergeMessageLayers", () => {
  it("merges ordered layers, lets later layers win by id, and filters archived/deleted messages", () => {
    const cache = normalizeMessages([
      createMessage("1"),
      createMessage("2", {
        metadata: {
          createdAt: 200,
          updatedAt: 200,
          liveStatus: "completed",
          lifecycleState: "active",
          modelId: "cache-model",
        },
      }),
      createMessage("3"),
      createMessage("5", {
        metadata: {
          createdAt: 500,
          updatedAt: 500,
          liveStatus: "completed",
          lifecycleState: "active",
        },
      }),
    ]);
    const persisted = normalizeMessages([
      createMessage("2", {
        metadata: {
          createdAt: 200,
          updatedAt: 250,
          liveStatus: "completed",
          lifecycleState: "active",
          modelId: "persisted-model",
        },
      }),
      createMessage("4"),
      createMessage("5", {
        metadata: {
          createdAt: 500,
          updatedAt: 500,
          liveStatus: "completed",
          lifecycleState: "archived",
        },
      }),
    ]);

    const merged = mergeMessageLayers([
      { messages: cache, dataSource: "cache" },
      { messages: persisted, dataSource: "convex-persisted" },
    ]);

    expect(merged.map((message) => message.id)).toEqual(["1", "2", "3", "4"]);
    expect(
      merged.find((message) => message.id === "2")?.metadata?.modelId
    ).toBe("persisted-model");
    expect(
      merged.find((message) => message.id === "2")?.metadata?.debug?.dataSource
    ).toBe("convex-persisted");
  });
});

describe("normalizeCanonicalMessages", () => {
  it("creates a diff-friendly order + byId projection", () => {
    const messages = [createMessage("1", { role: "user" }), createMessage("2")];

    const canonical = normalizeCanonicalMessages(messages);

    expect(canonical.order).toEqual(["1", "2"]);
    expect(canonical.byId["1"]).toMatchObject({
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "message-1" }],
    });
    expect(canonical.byId["2"]?.metadata?.createdAt).toBe(200);
  });
});

describe("diffCanonicalMessages", () => {
  it("emits no ops for identical canonical projections", () => {
    const canonical = normalizeCanonicalMessages([
      createMessage("1"),
      createMessage("2"),
    ]);

    const ops = diffCanonicalMessages(canonical, canonical, {
      debugMode: false,
    });

    expect(ops).toEqual([]);
  });

  it("emits only an order update when order changes but messages do not", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1"),
      createMessage("2"),
    ]);
    const next = normalizeCanonicalMessages([
      createMessage("2"),
      createMessage("1"),
    ]);

    const ops = diffCanonicalMessages(previous, next, { debugMode: false });

    expect(ops).toEqual([{ type: "setOrder", order: ["2", "1"] }]);
  });

  it("emits metadata-only updates and ignores debug-only changes when debug mode is off", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1", {
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "completed",
          lifecycleState: "active",
          modelId: "model-a",
          debug: { dataSource: "cache" },
        },
      }),
    ]);
    const nextWithDebugOnly = normalizeCanonicalMessages([
      createMessage("1", {
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "completed",
          lifecycleState: "active",
          modelId: "model-a",
          debug: { dataSource: "convex-persisted" },
        },
      }),
    ]);
    const nextWithMetadataChange = normalizeCanonicalMessages([
      createMessage("1", {
        metadata: {
          createdAt: 100,
          updatedAt: 101,
          liveStatus: "completed",
          lifecycleState: "active",
          modelId: "model-b",
          debug: { dataSource: "convex-persisted" },
        },
      }),
    ]);

    expect(
      diffCanonicalMessages(previous, nextWithDebugOnly, { debugMode: false })
    ).toEqual([]);

    expect(
      diffCanonicalMessages(previous, nextWithMetadataChange, {
        debugMode: false,
      })
    ).toEqual([
      {
        type: "setMessageMetadata",
        id: "1",
        metadata: nextWithMetadataChange.byId["1"]?.metadata,
      },
    ]);
  });

  it("emits part, add, remove, and order operations when canonical message set changes", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1"),
      createMessage("2", {
        parts: [{ type: "text", text: "before" }],
      }),
    ]);
    const next = normalizeCanonicalMessages([
      createMessage("2", {
        parts: [{ type: "text", text: "after" }],
      }),
      createMessage("3"),
    ]);

    const ops = diffCanonicalMessages(previous, next, { debugMode: false });

    expect(ops).toEqual([
      {
        type: "setMessageParts",
        id: "2",
        parts: [{ type: "text", text: "after" }],
      },
      {
        type: "upsertMessage",
        message: next.byId["3"],
      },
      {
        type: "removeMessage",
        id: "1",
      },
      {
        type: "setOrder",
        order: ["2", "3"],
      },
    ]);
  });
});
