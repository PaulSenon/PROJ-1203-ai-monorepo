import { useEffect, useMemo } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAppReadyUiDestination } from "@/hooks/use-app-ready";

const VIEWPORT_SCROLLBAR_HIDDEN_ATTR = "data-app-ready-hide-viewport-scrollbar";
const LOADER_DELAY_MS = 200;

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

  const loaderStyle = useMemo(
    () => ({
      opacity: destination.phase === "visible" ? 0 : 1,
      transitionDelay:
        destination.phase === "visible" ? "0ms" : `${LOADER_DELAY_MS}ms`,
    }),
    [destination.phase]
  );

  return (
    <div
      aria-hidden="true"
      className="md:-top-2 background absolute inset-x-0 top-0 bottom-0 z-2 flex items-center justify-center bg-background transition-opacity"
      style={style}
    >
      <Spinner
        aria-hidden="true"
        className="size-5 text-muted-foreground transition-opacity"
        style={loaderStyle}
      />
    </div>
  );
}
