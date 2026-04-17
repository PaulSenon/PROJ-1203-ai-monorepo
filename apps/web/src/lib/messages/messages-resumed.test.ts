import { describe, expect, it, vi } from "vitest";
import {
  canBuildResumedStreamedMessage,
  reconstructResumedStreamedMessage,
  selectResumedMessages,
} from "./messages-resumed";

describe("canBuildResumedStreamedMessage", () => {
  it("requires active stream id and at least one chunk", () => {
    expect(
      canBuildResumedStreamedMessage({
        isSkip: true,
        streamId: "stream-1",
        throttledMessageChunks: [{ chunk: 1 }],
      })
    ).toBe(false);

    expect(
      canBuildResumedStreamedMessage({
        isSkip: false,
        streamId: null,
        throttledMessageChunks: [{ chunk: 1 }],
      })
    ).toBe(false);

    expect(
      canBuildResumedStreamedMessage({
        isSkip: false,
        streamId: "stream-1",
        throttledMessageChunks: [],
      })
    ).toBe(false);

    expect(
      canBuildResumedStreamedMessage({
        isSkip: false,
        streamId: "stream-1",
        throttledMessageChunks: [{ chunk: 1 }],
      })
    ).toBe(true);
  });
});

describe("reconstructResumedStreamedMessage", () => {
  it("returns null when stream or chunks are missing", async () => {
    const buildMessage = vi.fn(async () => ({ id: "message-1" }));

    await expect(
      reconstructResumedStreamedMessage({
        streamId: null,
        throttledMessageChunks: [{ chunk: 1 }],
        buildMessage,
      })
    ).resolves.toBeNull();

    await expect(
      reconstructResumedStreamedMessage({
        streamId: "stream-1",
        throttledMessageChunks: [],
        buildMessage,
      })
    ).resolves.toBeNull();

    expect(buildMessage).not.toHaveBeenCalled();
  });

  it("reconstructs one streamed message from the current chunk window", async () => {
    const buildMessage = vi.fn(async () => ({ id: "message-1" }));

    await expect(
      reconstructResumedStreamedMessage({
        streamId: "stream-1",
        throttledMessageChunks: [{ chunk: 1 }, { chunk: 2 }],
        buildMessage,
      })
    ).resolves.toEqual({
      streamId: "stream-1",
      message: { id: "message-1" },
    });

    expect(buildMessage).toHaveBeenCalledWith([{ chunk: 1 }, { chunk: 2 }]);
  });
});

describe("selectResumedMessages", () => {
  it("keeps the resumed source as a zero-or-one message array", () => {
    expect(
      selectResumedMessages({
        isSkip: false,
        streamId: "stream-1",
        streamIsPending: true,
        streamed: { streamId: "stream-1", message: { id: "message-1" } },
      })
    ).toEqual({
      messages: [],
      isPending: true,
    });

    expect(
      selectResumedMessages({
        isSkip: false,
        streamId: "stream-1",
        streamIsPending: false,
        streamed: { streamId: "stream-2", message: { id: "message-1" } },
      })
    ).toEqual({
      messages: [],
      isPending: true,
    });

    expect(
      selectResumedMessages({
        isSkip: false,
        streamId: "stream-1",
        streamIsPending: false,
        streamed: { streamId: "stream-1", message: { id: "message-1" } },
      })
    ).toEqual({
      messages: [{ id: "message-1" }],
      isPending: false,
    });
  });
});
