import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { describe, expect, it } from "vitest";
import {
  createRegeneratePlan,
  type RegenerateMessageSelection,
} from "./messages-regenerate";

function createMessage(id: string, role: MyUIMessage["role"]): MyUIMessage {
  const createdAt = Number(id.replace(/\D/g, "")) || 1;

  return {
    id,
    role,
    metadata: {
      createdAt,
      updatedAt: createdAt,
      liveStatus: "completed",
      lifecycleState: "active",
    },
    parts: [{ type: "text", text: `${role}-${id}` }],
  };
}

describe("createRegeneratePlan", () => {
  it("finds the preceding user anchor before a target assistant chain", () => {
    const messages = new Map<string, MyUIMessage>([
      ["u1", createMessage("u1", "user")],
      ["a1", createMessage("a1", "assistant")],
      ["u2", createMessage("u2", "user")],
      ["a2", createMessage("a2", "assistant")],
      ["a3", createMessage("a3", "assistant")],
      ["u3", createMessage("u3", "user")],
    ]);

    const result = createRegeneratePlan({
      targetMessageId: "a3",
      orderedIds: ["u1", "a1", "u2", "a2", "a3", "u3"],
      getRole: (id: string) => messages.get(id)?.role,
      getMessage: (id: string) => messages.get(id),
    });

    const expectedAnchorMessage = messages.get("u2");
    if (!expectedAnchorMessage) {
      throw new Error("Expected anchor message to exist");
    }

    expect(result).toEqual<RegenerateMessageSelection>({
      anchorMessageId: "u2",
      messagesToDelete: ["a2", "a3", "u3"],
      anchorMessage: expectedAnchorMessage,
    });
  });

  it("returns null when no prior user anchor exists", () => {
    const messages = new Map<string, MyUIMessage>([
      ["a1", createMessage("a1", "assistant")],
    ]);

    const result = createRegeneratePlan({
      targetMessageId: "a1",
      orderedIds: ["a1"],
      getRole: (id: string) => messages.get(id)?.role,
      getMessage: (id: string) => messages.get(id),
    });

    expect(result).toBeNull();
  });
});
