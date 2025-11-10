import { useEffect } from "react";
import { onPageUnload } from "@/lib/browser/page-unload-helpers";

/**
 * Hook that calls a callback synchronously on page unload.
 * Uses visibilitychange event which fires earlier than beforeunload/pagehide,
 * giving async operations more time to complete before the page actually unloads.
 * The callback is called synchronously (fire and forget, no await).
 */
export function usePageUnload(callback: () => void) {
  useEffect(() => {
    const cleanup = onPageUnload(callback);
    return cleanup;
    // visibilitychange fires first, giving more time for async operations
  }, [callback]);
}
