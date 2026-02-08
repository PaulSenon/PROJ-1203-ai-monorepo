import { useCallback } from "react";
import type { MessageFooterCopyKind } from "../_parts/footer";
import type { StatusActionPayload } from "../_parts/status/_parts/status-actions";

export type UseMessageActionsParams = {
  messageId: string;
  role: "assistant" | "user";
  onCopy?: (kind: MessageFooterCopyKind) => void;
  onRetry?: (modelId?: string) => void;
  onContinue?: () => void;
};

export function useMessageActions({
  messageId,
  role,
  onCopy,
  onRetry,
  onContinue,
}: UseMessageActionsParams) {
  const handleCopy = useCallback(
    (kind: MessageFooterCopyKind) => {
      if (onCopy) {
        onCopy(kind);
        return;
      }

      console.log("handleCopy", { kind, messageId, role });
    },
    [messageId, onCopy, role]
  );

  const handleRetry = useCallback(
    (modelId?: string) => {
      if (onRetry) {
        onRetry(modelId);
        return;
      }

      console.log("handleRetry", { modelId, messageId, role });
    },
    [messageId, onRetry, role]
  );

  const handleStatusAction = useCallback(
    (payload: StatusActionPayload) => {
      if (payload.type === "continue") {
        if (onContinue) {
          onContinue();
        } else {
          console.log("handleContinue", { messageId, role });
        }
        return;
      }

      if (payload.type === "retry") {
        handleRetry();
        return;
      }

      if (payload.type === "retry-model") {
        handleRetry(payload.modelId);
        return;
      }

      const exhaustivePayload: never = payload;
      return exhaustivePayload;
    },
    [handleRetry, messageId, onContinue, role]
  );

  return {
    handleCopy,
    handleRetry,
    handleStatusAction,
  };
}
