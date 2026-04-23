import { useCallback } from "react";
import { useSaveToClipboard } from "@/hooks/utils/uas-save-to-clipboard";
import type { MessageFooterActionPayload } from "../_parts/footer/footer.types";

export type UseMessageActionsParams = {
  messageId: string;
  role: "assistant" | "user";
  readRawText: () => string;
};

export function useMessageActions({
  messageId,
  role,
  readRawText,
}: UseMessageActionsParams) {
  const saveToClipboard = useSaveToClipboard();

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
    },
    [messageId, readRawText, role, saveToClipboard]
  );

  return {
    handleFooterAction,
  };
}
