import { useEffect, useMemo } from "react";
import { useAppReadyUiDestination } from "@/hooks/use-app-ready";

const VIEWPORT_SCROLLBAR_HIDDEN_ATTR = "data-app-ready-hide-viewport-scrollbar";

export function ConversationReadyOverlay() {
  const destination = useAppReadyUiDestination("conversation-content");

  useEffect(() => {
    const root = document.documentElement;
    const shouldHideViewportScrollbar = destination.phase !== "visible";

    root.toggleAttribute(
      VIEWPORT_SCROLLBAR_HIDDEN_ATTR,
      shouldHideViewportScrollbar
    );

    return () => {
      root.removeAttribute(VIEWPORT_SCROLLBAR_HIDDEN_ATTR);
    };
  }, [destination.phase]);

  const style = useMemo(
    () => ({
      opacity: destination.phase === "hidden" ? 1 : 0,
      pointerEvents: destination.hidden ? ("auto" as const) : ("none" as const),
      transitionDuration: `${destination.transition.durationMs}ms`,
      transitionTimingFunction: destination.transition.easing,
    }),
    [destination]
  );

  return (
    <div
      aria-hidden="true"
      className="md:-top-2 background absolute inset-x-0 top-0 bottom-0 z-2 bg-background transition-opacity"
      style={style}
    />
  );
}
