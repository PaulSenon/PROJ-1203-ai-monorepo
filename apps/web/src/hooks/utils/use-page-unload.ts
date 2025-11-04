import { useEffect } from "react";

/**
 * Hook that calls a callback synchronously on page unload.
 * Uses visibilitychange event which fires earlier than beforeunload/pagehide,
 * giving async operations more time to complete before the page actually unloads.
 * The callback is called synchronously (fire and forget, no await).
 */
export function usePageUnload(callback: () => void) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only flush when page becomes hidden (not when it becomes visible)
      if (document.hidden) {
        console.log("visibilitychange - page hidden");
        callback();
      }
    };

    const handleBeforeUnload = () => {
      console.log("beforeunload");
      callback();
    };

    const handlePageHide = () => {
      console.log("pagehide");
      callback();
    };

    // visibilitychange fires first, giving more time for async operations
    document.addEventListener("visibilitychange", handleVisibilityChange);
    // beforeunload and pagehide as backup
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [callback]);
}
