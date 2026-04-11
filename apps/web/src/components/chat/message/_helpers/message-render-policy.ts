import type {
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";

type RenderedPartState = "streaming" | "done" | undefined;

type GetPartRenderPolicyInput = {
  metadata?: MyUIMessageMetadata;
  partState?: RenderedPartState;
  consolidate?: boolean;
};

export type PartRenderPolicy = {
  isStreaming: boolean;
  markdownMode: "streaming" | "static";
};

export function getPartRenderPolicy({
  metadata,
  partState,
  consolidate,
}: GetPartRenderPolicyInput): PartRenderPolicy {
  // Message-level settled state wins over stale part-level streaming flags.
  const isStreaming =
    !consolidate &&
    partState === "streaming" &&
    isLiveMessageMetadata(metadata);

  return {
    isStreaming,
    markdownMode: isStreaming ? "streaming" : "static",
  } satisfies PartRenderPolicy;
}

function isLiveMessageMetadata(metadata?: MyUIMessageMetadata) {
  if (metadata?.error) return false;

  if (
    metadata?.liveStatus === "completed" ||
    metadata?.liveStatus === "cancelled" ||
    metadata?.liveStatus === "error"
  ) {
    return false;
  }

  return true;
}
