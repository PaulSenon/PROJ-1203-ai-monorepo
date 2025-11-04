import { useCallback } from "react";

/**
 * saveToClipboard returns true or false if the text was saved to the clipboard.
 */
type Result = { success: true } | { success: false; error: Error };
export function useSaveToClipboard() {
  const saveToClipboard = useCallback(async (text: string): Promise<Result> => {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      return {
        success: false,
        error: new Error("Not in a browser environment"),
      };
    }

    // Try modern Clipboard API first
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { success: true };
      } catch (_error) {
        // If Clipboard API fails, fall back to execCommand
        // (e.g., might fail in non-secure contexts)
      }
    }

    // Fallback for older browsers or when Clipboard API fails
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      textarea.style.top = "-999999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const cmdSuccess = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (!cmdSuccess) {
        return {
          success: false,
          error: new Error("Failed to save to clipboard"),
        };
      }

      return { success: true };
    } catch (_error) {
      return {
        success: false,
        error: new Error("Failed to save to clipboard"),
      };
    }
  }, []);

  return saveToClipboard;
}
