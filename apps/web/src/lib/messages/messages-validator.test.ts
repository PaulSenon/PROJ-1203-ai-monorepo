import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { describe, expect, it } from "vitest";
import {
  type MessageStoreOp,
  normalizeCanonicalMessages,
} from "./messages-core";
import {
  validateCanonicalMessagesTransition,
  validateMessageStoreOps,
} from "./messages-validator";

const ROLE_INVARIANT_RE = /role invariant/i;
const NON_TAIL_PART_RE = /non-tail part/i;
const PART_TYPE_RE = /part type invariant/i;
const APPEND_ONLY_RE = /append-only/i;
const HOT_METADATA_RE = /hot metadata/i;

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

describe("validateCanonicalMessagesTransition", () => {
  it("accepts append-only tail mutation transitions", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1", {
        parts: [{ type: "text", text: "hello" }],
      }),
    ]);
    const next = normalizeCanonicalMessages([
      createMessage("1", {
        parts: [
          { type: "text", text: "hello world" },
          { type: "reasoning", text: "tail", state: "streaming" },
        ],
      }),
    ]);

    expect(() =>
      validateCanonicalMessagesTransition(previous, next)
    ).not.toThrow();
  });

  it("throws when role changes for an existing message id", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1", { role: "assistant" }),
    ]);
    const next = normalizeCanonicalMessages([
      createMessage("1", { role: "user" }),
    ]);

    expect(() => validateCanonicalMessagesTransition(previous, next)).toThrow(
      ROLE_INVARIANT_RE
    );
  });

  it("throws when a non-tail part mutates", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1", {
        parts: [
          { type: "text", text: "prefix" },
          { type: "reasoning", text: "tail", state: "streaming" },
        ],
      }),
    ]);
    const next = normalizeCanonicalMessages([
      createMessage("1", {
        parts: [
          { type: "text", text: "prefix changed" },
          { type: "reasoning", text: "tail", state: "streaming" },
        ],
      }),
    ]);

    expect(() => validateCanonicalMessagesTransition(previous, next)).toThrow(
      NON_TAIL_PART_RE
    );
  });

  it("throws when part type changes at the same index", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1", {
        parts: [{ type: "text", text: "hello" }],
      }),
    ]);
    const next = normalizeCanonicalMessages([
      createMessage("1", {
        parts: [{ type: "reasoning", text: "hello", state: "done" }],
      }),
    ]);

    expect(() => validateCanonicalMessagesTransition(previous, next)).toThrow(
      PART_TYPE_RE
    );
  });

  it("throws when parts are removed", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1", {
        parts: [
          { type: "text", text: "hello" },
          { type: "reasoning", text: "tail", state: "done" },
        ],
      }),
    ]);
    const next = normalizeCanonicalMessages([
      createMessage("1", {
        parts: [{ type: "text", text: "hello" }],
      }),
    ]);

    expect(() => validateCanonicalMessagesTransition(previous, next)).toThrow(
      APPEND_ONLY_RE
    );
  });
});

describe("validateMessageStoreOps", () => {
  it("accepts ops consistent with a valid transition", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1", {
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "streaming",
          lifecycleState: "active",
          debug: { dataSource: "http-stream" },
        },
        parts: [{ type: "text", text: "hello" }],
      }),
    ]);
    const next = normalizeCanonicalMessages([
      createMessage("1", {
        metadata: {
          createdAt: 100,
          updatedAt: 101,
          liveStatus: "completed",
          lifecycleState: "active",
          debug: { dataSource: "http-stream" },
        },
        parts: [{ type: "text", text: "hello world" }],
      }),
    ]);
    const ops: MessageStoreOp[] = [
      {
        type: "setMessageParts",
        id: "1",
        parts: next.byId["1"]?.parts ?? [],
      },
    ];

    expect(() => validateMessageStoreOps(previous, next, ops)).not.toThrow();
  });

  it("throws when ops rewrite metadata for a hot-only transition", () => {
    const previous = normalizeCanonicalMessages([
      createMessage("1", {
        metadata: {
          createdAt: 100,
          updatedAt: 100,
          liveStatus: "streaming",
          lifecycleState: "active",
          debug: { dataSource: "http-stream" },
        },
      }),
    ]);
    const next = normalizeCanonicalMessages([
      createMessage("1", {
        metadata: {
          createdAt: 100,
          updatedAt: 200,
          liveStatus: "completed",
          lifecycleState: "active",
          debug: { dataSource: "http-stream" },
          modelId: "ignored",
        },
      }),
    ]);
    const ops: MessageStoreOp[] = [
      {
        type: "setMessageMetadata",
        id: "1",
        metadata: next.byId["1"]?.metadata,
      },
    ];

    expect(() => validateMessageStoreOps(previous, next, ops)).toThrow(
      HOT_METADATA_RE
    );
  });
});
