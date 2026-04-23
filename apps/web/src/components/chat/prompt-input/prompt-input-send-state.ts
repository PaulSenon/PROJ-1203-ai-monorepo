import type { PromptInputSubmitProps } from "@/components/ai-elements/prompt-input";

export type PromptInputConversationStreamStatus =
  | "new"
  | "pending"
  | "streaming"
  | "completed"
  | "error"
  | "cancelled"
  | undefined;

export function getPromptInputSendState({
  isDraftDisabled,
  isSwitching,
  streamStatus,
}: {
  isDraftDisabled: boolean;
  isSwitching: boolean;
  streamStatus: PromptInputConversationStreamStatus;
}) {
  const isConversationBusy =
    streamStatus === "pending" || streamStatus === "streaming";
  const isDisabled = isDraftDisabled || isSwitching || isConversationBusy;

  let submitStatus: PromptInputSubmitProps["status"] = "ready";

  if (streamStatus === "error") {
    submitStatus = "error";
  } else if (isConversationBusy) {
    // `streaming` renders a stop icon in ai-elements, but cancel is unsupported.
    submitStatus = "submitted";
  }

  return {
    isDisabled,
    submitStatus,
  };
}
