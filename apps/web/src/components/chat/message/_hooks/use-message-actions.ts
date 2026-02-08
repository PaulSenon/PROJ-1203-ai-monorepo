import { useCallback } from "react";
import { useSaveToClipboard } from "@/hooks/utils/uas-save-to-clipboard";
import type { MessageFooterActionPayload } from "../_parts/footer/footer.types";
import type { StatusActionPayload } from "../_parts/status/_parts/status-actions";

export type UseMessageActionsParams = {
  messageId: string;
  role: "assistant" | "user";
  readRawText: () => string;
  onRetry?: (modelId?: string) => void;
  onContinue?: () => void;
  onEditRetry?: (text: string) => void;
};

export function useMessageActions({
  messageId,
  role,
  readRawText,
  onRetry,
  onContinue,
  onEditRetry,
}: UseMessageActionsParams) {
  const saveToClipboard = useSaveToClipboard();

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

  const handleEditRetry = useCallback(
    (text: string) => {
      if (onEditRetry) {
        onEditRetry(text);
        return;
      }

      console.log("handleEditRetry", { text, messageId, role });
      handleRetry();
    },
    [handleRetry, messageId, onEditRetry, role]
  );

  const handleFooterAction = useCallback(
    async (payload: MessageFooterActionPayload) => {
      if (payload.type === "copy") {
        const text = readRawText();
        if (text.trim().length === 0) {
          console.log("handleCopy skipped empty raw text", { messageId, role });
          return false;
        }

        const result = await saveToClipboard(text);
        if (!result.success) {
          console.error("handleCopy failed", {
            error: result.error,
            messageId,
            role,
          });
          return false;
        }
        return true;
      }

      if (payload.type === "retry") {
        handleRetry(payload.modelId);
        return;
      }

      if (payload.type === "edit-retry") {
        handleEditRetry(payload.text);
        return;
      }

      const exhaustivePayload: never = payload;
      return exhaustivePayload;
    },
    [
      handleEditRetry,
      handleRetry,
      messageId,
      readRawText,
      role,
      saveToClipboard,
    ]
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
    handleFooterAction,
    handleStatusAction,
  };
}
