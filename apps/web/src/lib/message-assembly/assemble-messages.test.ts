import { describe, expect, it } from "vitest";

import {
  assembleMessages,
  normalizeMessages,
} from "./assemble-messages";
import {
  makeAssistantMessage,
  makeUserMessage,
} from "./message-assembly.fixtures";

describe("assembleMessages", () => {
  it("keeps one canonical row when persisted hands off the same cached id", () => {
    const cached = makeUserMessage({
      id: "m1",
      metadata: {
        createdAt: 10,
        updatedAt: 10,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const persisted = makeUserMessage({
      id: "m1",
      metadata: {
        createdAt: 10,
        updatedAt: 20,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });

    const messages = assembleMessages({
      cache: normalizeMessages([cached], { debugLabel: "cache" }),
      persisted: normalizeMessages([persisted], {
        reverse: true,
        debugLabel: "persisted",
      }),
      optimistic: normalizeMessages([], { debugLabel: "optimistic" }),
      resumed: normalizeMessages([], { debugLabel: "convex-stream" }),
      http: normalizeMessages([], { debugLabel: "http-stream" }),
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.id).toBe("m1");
    expect(messages[0]?.metadata?.updatedAt).toBe(20);
    expect(messages[0]?.metadata?.debug?.dataSource).toBe("convex-persisted");
  });

  it("lets optimistic messages override existing base ids", () => {
    const persisted = makeAssistantMessage({
      id: "m1",
      parts: [{ type: "text", text: "old", state: "done" }],
      metadata: {
        createdAt: 10,
        updatedAt: 10,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const optimistic = makeAssistantMessage({
      id: "m1",
      parts: [{ type: "text", text: "new", state: "done" }],
      metadata: {
        createdAt: 10,
        updatedAt: 11,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });

    const messages = assembleMessages({
      cache: normalizeMessages([], { debugLabel: "cache" }),
      persisted: normalizeMessages([persisted], {
        reverse: true,
        debugLabel: "persisted",
      }),
      optimistic: normalizeMessages([optimistic], { debugLabel: "optimistic" }),
      resumed: normalizeMessages([], { debugLabel: "convex-stream" }),
      http: normalizeMessages([], { debugLabel: "http-stream" }),
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.parts[0]).toEqual(optimistic.parts[0]);
    expect(messages[0]?.metadata?.debug?.dataSource).toBe("optimistic");
  });

  it("appends optimistic messages when the id is new", () => {
    const persisted = makeUserMessage({
      id: "m1",
      metadata: {
        createdAt: 10,
        updatedAt: 10,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const optimistic = makeAssistantMessage({
      id: "m2",
      metadata: {
        createdAt: 20,
        updatedAt: 20,
        liveStatus: "pending",
        lifecycleState: "active",
      },
    });

    const messages = assembleMessages({
      cache: normalizeMessages([], { debugLabel: "cache" }),
      persisted: normalizeMessages([persisted], {
        reverse: true,
        debugLabel: "persisted",
      }),
      optimistic: normalizeMessages([optimistic], { debugLabel: "optimistic" }),
      resumed: normalizeMessages([], { debugLabel: "convex-stream" }),
      http: normalizeMessages([], { debugLabel: "http-stream" }),
    });

    expect(messages.map((message) => message.id)).toEqual(["m1", "m2"]);
    expect(messages[1]?.id).toBe("m2");
    expect(messages[1]?.metadata?.debug?.dataSource).toBe("optimistic");
  });

  it("applies live overlays after the base merge", () => {
    const persisted = makeAssistantMessage({
      id: "m2",
      parts: [{ type: "text", text: "persisted", state: "done" }],
      metadata: {
        createdAt: 20,
        updatedAt: 20,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const resumed = makeAssistantMessage({
      id: "m2",
      parts: [{ type: "text", text: "resumed", state: "streaming" }],
      metadata: {
        createdAt: 20,
        updatedAt: 21,
        liveStatus: "streaming",
        lifecycleState: "active",
      },
    });
    const http = makeAssistantMessage({
      id: "m2",
      parts: [{ type: "text", text: "http", state: "streaming" }],
      metadata: {
        createdAt: 20,
        updatedAt: 22,
        liveStatus: "streaming",
        lifecycleState: "active",
      },
    });

    const messages = assembleMessages({
      cache: normalizeMessages([], { debugLabel: "cache" }),
      persisted: normalizeMessages([persisted], {
        reverse: true,
        debugLabel: "persisted",
      }),
      optimistic: normalizeMessages([], { debugLabel: "optimistic" }),
      resumed: normalizeMessages([resumed], { debugLabel: "convex-stream" }),
      http: normalizeMessages([http], { debugLabel: "http-stream" }),
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.parts[0]).toEqual(http.parts[0]);
    expect(messages[0]?.metadata?.debug?.dataSource).toBe("http-stream");
  });

  it("filters archived and deleted messages from the final transcript", () => {
    const active = makeUserMessage({
      id: "m1",
      metadata: {
        createdAt: 10,
        updatedAt: 10,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const archived = makeAssistantMessage({
      id: "m2",
      metadata: {
        createdAt: 20,
        updatedAt: 20,
        liveStatus: "completed",
        lifecycleState: "archived",
      },
    });
    const deleted = makeAssistantMessage({
      id: "m3",
      metadata: {
        createdAt: 30,
        updatedAt: 30,
        liveStatus: "completed",
        lifecycleState: "deleted",
      },
    });

    const messages = assembleMessages({
      cache: normalizeMessages([active], { debugLabel: "cache" }),
      persisted: normalizeMessages([deleted, archived], {
        reverse: true,
        debugLabel: "persisted",
      }),
      optimistic: normalizeMessages([], { debugLabel: "optimistic" }),
      resumed: normalizeMessages([], { debugLabel: "convex-stream" }),
      http: normalizeMessages([], { debugLabel: "http-stream" }),
    });

    expect(messages.map((message) => message.id)).toEqual(["m1"]);
  });

  it("keeps canonical oldest to newest order when older persisted history prepends", () => {
    const newerA = makeUserMessage({
      id: "m2",
      metadata: {
        createdAt: 20,
        updatedAt: 20,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const newerB = makeAssistantMessage({
      id: "m3",
      metadata: {
        createdAt: 30,
        updatedAt: 30,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const olderA = makeUserMessage({
      id: "m0",
      metadata: {
        createdAt: 0,
        updatedAt: 0,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const olderB = makeAssistantMessage({
      id: "m1",
      metadata: {
        createdAt: 10,
        updatedAt: 10,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });

    const messages = assembleMessages({
      cache: normalizeMessages([], { debugLabel: "cache" }),
      persisted: normalizeMessages([newerB, newerA, olderB, olderA], {
        reverse: true,
        debugLabel: "persisted",
      }),
      optimistic: normalizeMessages([], { debugLabel: "optimistic" }),
      resumed: normalizeMessages([], { debugLabel: "convex-stream" }),
      http: normalizeMessages([], { debugLabel: "http-stream" }),
    });

    expect(messages.map((message) => message.id)).toEqual([
      "m0",
      "m1",
      "m2",
      "m3",
    ]);
  });
});
