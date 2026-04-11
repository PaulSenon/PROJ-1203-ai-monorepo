import type { MyUIMessageMetadata } from "@ai-monorepo/ai/types/uiMessage";
import { describe, expect, it } from "vitest";

import { getPartRenderPolicy } from "./message-render-policy";

function makeMetadata(
  overrides: Partial<MyUIMessageMetadata> = {}
): MyUIMessageMetadata {
  return {
    createdAt: 1,
    updatedAt: 1,
    liveStatus: "streaming",
    lifecycleState: "active",
    ...overrides,
  } satisfies MyUIMessageMetadata;
}

describe("getPartRenderPolicy", () => {
  it("streams only for live non-consolidated streaming parts", () => {
    const policy = getPartRenderPolicy({
      metadata: makeMetadata({ liveStatus: "streaming" }),
      partState: "streaming",
      consolidate: false,
    });

    expect(policy).toEqual({
      isStreaming: true,
      markdownMode: "streaming",
    });
  });

  it("forces static rendering for consolidated rows even if part state still streams", () => {
    const policy = getPartRenderPolicy({
      metadata: makeMetadata({ liveStatus: "streaming" }),
      partState: "streaming",
      consolidate: true,
    });

    expect(policy).toEqual({
      isStreaming: false,
      markdownMode: "static",
    });
  });

  it("forces static rendering once message is completed even if part state still streams", () => {
    const policy = getPartRenderPolicy({
      metadata: makeMetadata({ liveStatus: "completed" }),
      partState: "streaming",
      consolidate: false,
    });

    expect(policy).toEqual({
      isStreaming: false,
      markdownMode: "static",
    });
  });

  it("forces static rendering once message errors even if part state still streams", () => {
    const policy = getPartRenderPolicy({
      metadata: makeMetadata({
        liveStatus: "streaming",
        error: {
          kind: "UNKNOWN_ERROR",
          message: "boom",
        },
      }),
      partState: "streaming",
      consolidate: false,
    });

    expect(policy).toEqual({
      isStreaming: false,
      markdownMode: "static",
    });
  });

  it("keeps static mode for done parts", () => {
    const policy = getPartRenderPolicy({
      metadata: makeMetadata({ liveStatus: "streaming" }),
      partState: "done",
      consolidate: false,
    });

    expect(policy).toEqual({
      isStreaming: false,
      markdownMode: "static",
    });
  });
});
