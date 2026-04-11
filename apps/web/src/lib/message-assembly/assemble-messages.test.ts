import { describe, expect, it } from "vitest";

import {
  assembleMessages,
  normalizeMessages,
} from "./assemble-messages";
import {
  makeAssistantMessage,
  makeReasoningPart,
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
      enableDebugDataSource: true,
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
      enableDebugDataSource: true,
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
      enableDebugDataSource: true,
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
      enableDebugDataSource: true,
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
      enableDebugDataSource: true,
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
      enableDebugDataSource: true,
    });

    expect(messages.map((message) => message.id)).toEqual([
      "m0",
      "m1",
      "m2",
      "m3",
    ]);
  });

  it("reuses a row across cache to persisted handoff when visible output is unchanged", () => {
    const cached = makeAssistantMessage({
      id: "m1",
      metadata: {
        createdAt: 10,
        updatedAt: 10,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const persisted = makeAssistantMessage({
      id: "m1",
      metadata: {
        createdAt: 10,
        updatedAt: 99,
        liveStatus: "completed",
        lifecycleState: "active",
        usage: { totalTokens: 123 },
      },
    });

    const previous = assembleMessages({
      cache: normalizeMessages([cached]),
      persisted: normalizeMessages([]),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([]),
    });
    const next = assembleMessages({
      cache: normalizeMessages([cached]),
      persisted: normalizeMessages([persisted], { reverse: true }),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([]),
      previous,
    });

    expect(next[0]).toBe(previous[0]);
    expect(next[0]?.metadata).toBe(previous[0]?.metadata);
  });

  it("breaks reuse in debug mode when datasource ownership changes", () => {
    const cached = makeAssistantMessage({ id: "m1" });
    const persisted = makeAssistantMessage({ id: "m1" });

    const previous = assembleMessages({
      cache: normalizeMessages([cached]),
      persisted: normalizeMessages([]),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([]),
      enableDebugDataSource: true,
    });
    const next = assembleMessages({
      cache: normalizeMessages([cached]),
      persisted: normalizeMessages([persisted], { reverse: true }),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([]),
      previous,
      enableDebugDataSource: true,
    });

    expect(next[0]).not.toBe(previous[0]);
    expect(next[0]?.metadata?.debug?.dataSource).toBe("convex-persisted");
  });

  it("keeps settled neighbors stable when only the active tail changes", () => {
    const stable = makeUserMessage({ id: "m1" });
    const tailBefore = makeAssistantMessage({
      id: "m2",
      parts: [{ type: "text", text: "hel", state: "streaming" }],
      metadata: {
        createdAt: 20,
        updatedAt: 20,
        liveStatus: "streaming",
        lifecycleState: "active",
      },
    });
    const tailAfter = makeAssistantMessage({
      id: "m2",
      parts: [{ type: "text", text: "hello", state: "streaming" }],
      metadata: {
        createdAt: 20,
        updatedAt: 21,
        liveStatus: "streaming",
        lifecycleState: "active",
      },
    });

    const previous = assembleMessages({
      cache: normalizeMessages([stable, tailBefore]),
      persisted: normalizeMessages([]),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([]),
    });
    const next = assembleMessages({
      cache: normalizeMessages([stable, tailAfter]),
      persisted: normalizeMessages([]),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([]),
      previous,
    });

    expect(next[0]).toBe(previous[0]);
    expect(next[1]).not.toBe(previous[1]);
  });

  it("reuses unchanged parts when another part grows", () => {
    const before = makeAssistantMessage({
      id: "m1",
      parts: [makeReasoningPart("plan"), { type: "text", text: "hel", state: "streaming" }],
      metadata: {
        createdAt: 10,
        updatedAt: 10,
        liveStatus: "streaming",
        lifecycleState: "active",
      },
    });
    const after = makeAssistantMessage({
      id: "m1",
      parts: [makeReasoningPart("plan"), { type: "text", text: "hello", state: "streaming" }],
      metadata: {
        createdAt: 10,
        updatedAt: 11,
        liveStatus: "streaming",
        lifecycleState: "active",
      },
    });

    const previous = assembleMessages({
      cache: normalizeMessages([before]),
      persisted: normalizeMessages([]),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([]),
    });
    const next = assembleMessages({
      cache: normalizeMessages([after]),
      persisted: normalizeMessages([]),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([]),
      previous,
    });

    expect(next[0]).not.toBe(previous[0]);
    expect(next[0]?.parts[0]).toBe(previous[0]?.parts[0]);
    expect(next[0]?.parts[1]).not.toBe(previous[0]?.parts[1]);
  });

  it("reuses a row across http to persisted handoff when visible output is unchanged", () => {
    const http = makeAssistantMessage({
      id: "m1",
      parts: [{ type: "text", text: "done", state: "done" }],
      metadata: {
        createdAt: 10,
        updatedAt: 10,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });
    const persisted = makeAssistantMessage({
      id: "m1",
      parts: [{ type: "text", text: "done", state: "done" }],
      metadata: {
        createdAt: 10,
        updatedAt: 999,
        liveStatus: "completed",
        lifecycleState: "active",
      },
    });

    const previous = assembleMessages({
      cache: normalizeMessages([]),
      persisted: normalizeMessages([]),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([http]),
    });
    const next = assembleMessages({
      cache: normalizeMessages([]),
      persisted: normalizeMessages([persisted], { reverse: true }),
      optimistic: normalizeMessages([]),
      resumed: normalizeMessages([]),
      http: normalizeMessages([]),
      previous,
    });

    expect(next[0]).toBe(previous[0]);
  });
});
