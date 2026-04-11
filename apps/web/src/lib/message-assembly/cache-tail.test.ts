import { describe, expect, it } from "vitest";

import { planCacheTailWrite } from "./cache-tail";
import {
  makeAssistantMessage,
  makeReasoningPart,
  makeUserMessage,
} from "./message-assembly.fixtures";

describe("planCacheTailWrite", () => {
  it("writes the first non-empty tail", () => {
    const result = planCacheTailWrite({
      messages: [makeUserMessage({ id: "m1" })],
    });

    expect(result.shouldWrite).toBe(true);
    expect(result.tail.map((message) => message.id)).toEqual(["m1"]);
  });

  it("skips writes when the tail contract is unchanged", () => {
    const previousTail = [makeUserMessage({ id: "m1" })];

    const result = planCacheTailWrite({
      messages: [makeUserMessage({ id: "m1" })],
      previousTail,
    });

    expect(result.shouldWrite).toBe(false);
  });

  it("skips writes when only older prepended history changes", () => {
    const newerA = makeUserMessage({ id: "m2" });
    const newerB = makeAssistantMessage({ id: "m3" });
    const previousTail = [newerA, newerB];

    const result = planCacheTailWrite({
      messages: [
        makeUserMessage({ id: "m0" }),
        makeAssistantMessage({ id: "m1" }),
        newerA,
        newerB,
      ],
      previousTail,
      limit: 2,
    });

    expect(result.shouldWrite).toBe(false);
    expect(result.tail.map((message) => message.id)).toEqual(["m2", "m3"]);
  });

  it("skips writes for non-visual metadata changes", () => {
    const previousTail = [
      makeAssistantMessage({
        id: "m1",
        metadata: {
          createdAt: 10,
          updatedAt: 10,
          liveStatus: "completed",
          lifecycleState: "active",
        },
      }),
    ];

    const result = planCacheTailWrite({
      messages: [
        makeAssistantMessage({
          id: "m1",
          metadata: {
            createdAt: 10,
            updatedAt: 999,
            liveStatus: "completed",
            lifecycleState: "active",
            timing: { lastTokenReceivedAt: 999 },
            usage: { totalTokens: 123 },
          },
        }),
      ],
      previousTail,
    });

    expect(result.shouldWrite).toBe(false);
  });

  it("writes when the active tail text grows", () => {
    const previousTail = [
      makeAssistantMessage({
        id: "m1",
        parts: [{ type: "text", text: "hel", state: "streaming" }],
        metadata: {
          createdAt: 10,
          updatedAt: 10,
          liveStatus: "streaming",
          lifecycleState: "active",
        },
      }),
    ];

    const result = planCacheTailWrite({
      messages: [
        makeAssistantMessage({
          id: "m1",
          parts: [{ type: "text", text: "hello", state: "streaming" }],
          metadata: {
            createdAt: 10,
            updatedAt: 11,
            liveStatus: "streaming",
            lifecycleState: "active",
          },
        }),
      ],
      previousTail,
    });

    expect(result.shouldWrite).toBe(true);
  });

  it("writes when visible metadata changes", () => {
    const previousTail = [
      makeAssistantMessage({
        id: "m1",
        metadata: {
          createdAt: 10,
          updatedAt: 10,
          liveStatus: "streaming",
          lifecycleState: "active",
        },
      }),
    ];

    const result = planCacheTailWrite({
      messages: [
        makeAssistantMessage({
          id: "m1",
          metadata: {
            createdAt: 10,
            updatedAt: 11,
            liveStatus: "completed",
            lifecycleState: "active",
          },
        }),
      ],
      previousTail,
    });

    expect(result.shouldWrite).toBe(true);
  });

  it("writes when reasoning output changes", () => {
    const previousTail = [
      makeAssistantMessage({
        id: "m1",
        parts: [makeReasoningPart("plan")],
      }),
    ];

    const result = planCacheTailWrite({
      messages: [
        makeAssistantMessage({
          id: "m1",
          parts: [makeReasoningPart("plan more")],
        }),
      ],
      previousTail,
    });

    expect(result.shouldWrite).toBe(true);
  });
});
