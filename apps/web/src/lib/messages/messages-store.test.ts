import { createOptimisticStepStartMessage } from "@ai-monorepo/ai/helpers";
import { describe, expect, it, vi } from "vitest";
import {
  diffCanonicalMessages,
  normalizeCanonicalMessages,
} from "./messages-core";
import { applyMessageStoreOps, createMessagesStore } from "./messages-store";

describe("createMessagesStore", () => {
  it("creates ordered ids and message nodes from canonical messages", () => {
    const canonical = normalizeCanonicalMessages([
      {
        id: "1",
        role: "assistant",
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "completed",
          lifecycleState: "active",
        },
        parts: [{ type: "text", text: "first" }],
      },
    ]);

    const store = createMessagesStore(canonical);
    const firstNode = store.messagesById.get("1");

    expect(store.orderedIds$.get()).toEqual(["1"]);
    expect(firstNode?.id).toBe("1");
    expect(firstNode?.role$.get()).toBe("assistant");
    expect(firstNode?.metadata$.get()).toEqual({
      createdAt: 100,
      updatedAt: 100,
      liveStatus: "completed",
      lifecycleState: "active",
    });
    expect(firstNode?.parts$.get()).toEqual([{ type: "text", text: "first" }]);
  });

  it("preserves unsupported upstream parts without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const canonical = normalizeCanonicalMessages([
      createOptimisticStepStartMessage("optimistic-step"),
    ]);

    const store = createMessagesStore(canonical);
    const node = store.messagesById.get("optimistic-step");

    expect(node?.parts$.get()).toEqual([{ type: "step-start" }]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("applyMessageStoreOps", () => {
  it("applies metadata, parts, add, remove, and order operations to leaf observables", () => {
    const initial = normalizeCanonicalMessages([
      {
        id: "1",
        role: "assistant",
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "completed",
          lifecycleState: "active",
        },
        parts: [{ type: "text", text: "first" }],
      },
      {
        id: "2",
        role: "user",
        metadata: {
          createdAt: 200,
          updatedAt: 200,
          liveStatus: "completed",
          lifecycleState: "active",
        },
        parts: [{ type: "text", text: "second" }],
      },
    ]);
    const store = createMessagesStore(initial);

    applyMessageStoreOps(store, [
      {
        type: "setMessageMetadata",
        id: "1",
        metadata: {
          createdAt: 100,
          updatedAt: 101,
          liveStatus: "completed",
          lifecycleState: "active",
          modelId: "model-b",
        },
      },
      {
        type: "setMessageParts",
        id: "2",
        parts: [{ type: "text", text: "second-updated" }],
      },
      {
        type: "upsertMessage",
        message: {
          id: "3",
          role: "assistant",
          metadata: {
            createdAt: 300,
            updatedAt: 300,
            liveStatus: "completed",
            lifecycleState: "active",
          },
          parts: [{ type: "text", text: "third" }],
        },
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

    expect(store.orderedIds$.get()).toEqual(["2", "3"]);
    expect(store.messagesById.has("1")).toBe(false);
    expect(store.messagesById.get("2")?.parts$.get()).toEqual([
      { type: "text", text: "second-updated" },
    ]);
    expect(store.messagesById.get("3")?.role$.get()).toBe("assistant");
    expect(store.messagesById.get("3")?.metadata$.get()?.createdAt).toBe(300);
  });

  it("preserves parts leaf identity on metadata-only updates", () => {
    const initial = normalizeCanonicalMessages([
      {
        id: "1",
        role: "assistant",
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "completed",
          lifecycleState: "active",
        },
        parts: [{ type: "text", text: "first" }],
      },
    ]);
    const store = createMessagesStore(initial);
    const node = store.messagesById.get("1");
    const partsLeaf = node?.parts$;
    const partsValue = node?.parts$.get();

    applyMessageStoreOps(store, [
      {
        type: "setMessageMetadata",
        id: "1",
        metadata: {
          createdAt: 100,
          updatedAt: 101,
          liveStatus: "completed",
          lifecycleState: "active",
          modelId: "model-b",
        },
      },
    ]);

    expect(store.messagesById.get("1")).toBe(node);
    expect(store.messagesById.get("1")?.parts$).toBe(partsLeaf);
    expect(store.messagesById.get("1")?.parts$.get()).toBe(partsValue);
  });

  it("preserves message node identity on order-only updates", () => {
    const initial = normalizeCanonicalMessages([
      {
        id: "1",
        role: "assistant",
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "completed",
          lifecycleState: "active",
        },
        parts: [{ type: "text", text: "first" }],
      },
      {
        id: "2",
        role: "user",
        metadata: {
          createdAt: 200,
          updatedAt: 200,
          liveStatus: "completed",
          lifecycleState: "active",
        },
        parts: [{ type: "text", text: "second" }],
      },
    ]);
    const store = createMessagesStore(initial);
    const firstNode = store.messagesById.get("1");
    const secondNode = store.messagesById.get("2");

    applyMessageStoreOps(store, [{ type: "setOrder", order: ["2", "1"] }]);

    expect(store.orderedIds$.get()).toEqual(["2", "1"]);
    expect(store.messagesById.get("1")).toBe(firstNode);
    expect(store.messagesById.get("2")).toBe(secondNode);
  });

  it("preserves node identity through optimistic-to-persisted replacement for the same message id", () => {
    const previous = normalizeCanonicalMessages([
      {
        id: "1",
        role: "user",
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "completed",
          lifecycleState: "active",
        },
        parts: [{ type: "text", text: "user" }],
      },
      {
        id: "2",
        role: "assistant",
        metadata: {
          createdAt: 200,
          updatedAt: 200,
          liveStatus: "pending",
          lifecycleState: "active",
          debug: { dataSource: "optimistic" },
        },
        parts: [{ type: "step-start" }],
      },
    ]);
    const next = normalizeCanonicalMessages([
      {
        id: "1",
        role: "user",
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "completed",
          lifecycleState: "active",
        },
        parts: [{ type: "text", text: "user" }],
      },
      {
        id: "2",
        role: "assistant",
        metadata: {
          createdAt: 200,
          updatedAt: 300,
          liveStatus: "completed",
          lifecycleState: "active",
          debug: { dataSource: "convex-persisted" },
        },
        parts: [{ type: "text", text: "persisted" }],
      },
    ]);
    const store = createMessagesStore(previous);
    const userNode = store.messagesById.get("1");
    const assistantNode = store.messagesById.get("2");

    const ops = diffCanonicalMessages(previous, next, { debugMode: false });
    applyMessageStoreOps(store, ops);

    expect(store.messagesById.get("1")).toBe(userNode);
    expect(store.messagesById.get("2")).toBe(assistantNode);
    expect(store.messagesById.get("2")?.metadata$.get()?.updatedAt).toBe(300);
    expect(store.messagesById.get("2")?.parts$.get()).toEqual([
      { type: "text", text: "persisted" },
    ]);
  });
});
