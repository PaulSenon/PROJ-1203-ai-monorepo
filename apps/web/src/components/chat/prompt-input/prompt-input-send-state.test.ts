import { describe, expect, it } from "vitest";
import { getPromptInputSendState } from "./prompt-input-send-state";

describe("getPromptInputSendState", () => {
  it("disables input and shows submitted while pending", () => {
    expect(
      getPromptInputSendState({
        isDraftDisabled: false,
        isSwitching: false,
        streamStatus: "pending",
      })
    ).toEqual({
      isDisabled: true,
      submitStatus: "submitted",
    });
  });

  it("disables input and keeps submitted spinner while streaming", () => {
    expect(
      getPromptInputSendState({
        isDraftDisabled: false,
        isSwitching: false,
        streamStatus: "streaming",
      })
    ).toEqual({
      isDisabled: true,
      submitStatus: "submitted",
    });
  });

  it("keeps error status enabled for retry by new send", () => {
    expect(
      getPromptInputSendState({
        isDraftDisabled: false,
        isSwitching: false,
        streamStatus: "error",
      })
    ).toEqual({
      isDisabled: false,
      submitStatus: "error",
    });
  });

  it("falls back to ready when conversation is idle", () => {
    expect(
      getPromptInputSendState({
        isDraftDisabled: false,
        isSwitching: false,
        streamStatus: "completed",
      })
    ).toEqual({
      isDisabled: false,
      submitStatus: "ready",
    });
  });

  it("keeps external blockers dominant over idle conversation status", () => {
    expect(
      getPromptInputSendState({
        isDraftDisabled: true,
        isSwitching: true,
        streamStatus: undefined,
      })
    ).toEqual({
      isDisabled: true,
      submitStatus: "ready",
    });
  });
});
