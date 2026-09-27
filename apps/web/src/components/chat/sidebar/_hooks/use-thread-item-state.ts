import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { useMemo } from "react";

type ThreadDoc = Doc<"threads">;

export type LiveStateIndicatorVariant =
  | "pending"
  | "error"
  | "unread"
  | "need-action";

function reduceLiveStatusToIndicatorVariant(
  liveStatus: ThreadDoc["liveStatus"]
): LiveStateIndicatorVariant | undefined {
  if (liveStatus === "pending" || liveStatus === "streaming") {
    return "pending";
  }
  if (liveStatus === "error") {
    return "error";
  }
  if (liveStatus === "completed") {
    return undefined;
  }
  return undefined;
}

export function useThreadItemState(thread: ThreadDoc) {
  return useMemo(
    () => ({
      indicatorVariant: reduceLiveStatusToIndicatorVariant(thread.liveStatus),
      isLoading:
        thread.liveStatus === "pending" || thread.liveStatus === "streaming",
      tooltip: thread.title || "Loading title",
    }),
    [thread.liveStatus, thread.title]
  );
}
