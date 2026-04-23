import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { describe, expect, it } from "vitest";
import {
  getLatestVisibleMessages,
  hasSameMessageReferenceList,
  normalizeMessages,
  trimCacheMessagesAgainstPersisted,
  trimPersistedMessagesForResumedStream,
} from "./conversation-message-helpers";

function createMessage(
  id: string,
  role: MyUIMessage["role"] = "assistant",
  createdAt = 1,
  liveStatus: NonNullable<MyUIMessage["metadata"]>["liveStatus"] = "completed"
) {
  return {
    id,
    role,
    parts: [],
    metadata: {
      createdAt,
      updatedAt: createdAt,
      lifecycleState: "active",
      liveStatus,
    },
  } satisfies MyUIMessage;
}

describe("conversation-message-helpers", () => {
  it("trims trailing persisted pending assistant while resumed stream is pending", () => {
    const persistedMessages = normalizeMessages([
      createMessage("u1", "user", 1),
      createMessage("a1", "assistant", 2, "streaming"),
    ]);

    const trimmed = trimPersistedMessagesForResumedStream(persistedMessages, {
      isResumedMessagePending: true,
      resumeStreamEnabled: true,
    });

    expect(trimmed.map((message) => message.id)).toEqual(["u1"]);
  });

  it("keeps persisted tail when resumed stream is not active", () => {
    const persistedMessages = normalizeMessages([
      createMessage("u1", "user", 1),
      createMessage("a1", "assistant", 2, "streaming"),
    ]);

    const trimmed = trimPersistedMessagesForResumedStream(persistedMessages, {
      isResumedMessagePending: false,
      resumeStreamEnabled: true,
    });

    expect(trimmed).toBe(persistedMessages);
  });

  it("trims cache overlap window around persisted boundaries", () => {
    const cacheMessages = normalizeMessages([
      createMessage("1", "user", 1),
      createMessage("2", "assistant", 2),
      createMessage("3", "user", 3),
      createMessage("4", "assistant", 4),
      createMessage("5", "user", 5),
      createMessage("6", "assistant", 6),
    ]);
    const persistedMessages = normalizeMessages([
      createMessage("3", "user", 3),
      createMessage("4", "assistant", 4),
      createMessage("5", "user", 5),
    ]);

    const trimmed = trimCacheMessagesAgainstPersisted(
      cacheMessages,
      persistedMessages
    );

    expect(trimmed.map((message) => message.id)).toEqual(["1", "2", "6"]);
  });

  it("selects the latest visible messages from the latest ordered ids window", () => {
    const messages = [
      createMessage("1", "user", 1),
      createMessage("2", "assistant", 2),
      createMessage("3", "user", 3),
    ];

    expect(
      getLatestVisibleMessages(
        ["1", "2", "missing", "3"],
        {
          "1": messages[0],
          "2": messages[1],
          "3": messages[2],
        },
        2
      ).map((message) => message.id)
    ).toEqual(["3"]);
  });

  it("detects identical message tails by reference", () => {
    const first = createMessage("1", "user", 1);
    const second = createMessage("2", "assistant", 2);

    expect(hasSameMessageReferenceList([first, second], [first, second])).toBe(
      true
    );
    expect(
      hasSameMessageReferenceList([first, second], [
        first,
        { ...second },
      ] as MyUIMessage[])
    ).toBe(false);
  });
});
