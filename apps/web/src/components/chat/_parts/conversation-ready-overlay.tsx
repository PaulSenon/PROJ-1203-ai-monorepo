import { Activity, type CSSProperties, useEffect, useMemo } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAppReadyUiDestination } from "@/hooks/use-app-ready";
import { cn } from "@/lib/utils";

const VIEWPORT_SCROLLBAR_HIDDEN_ATTR = "data-app-ready-hide-viewport-scrollbar";

export function ConversationReadyOverlay() {
  const destination = useAppReadyUiDestination("conversation-content");

  // This is to toggle some global css to deal with window scrollbar while transitioning.
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

  // This compute the overlay procedural style (dynamic duration and easing from core logic)
  // because will show snappier or even skip transition on snappy devices.
  const style = useMemo(
    () =>
      ({
        "--duration": `${destination.transition.durationMs}ms`,
        "--easing": destination.transition.easing,
      }) as CSSProperties,
    [destination]
  );

  return (
    <Activity mode={destination.phase === "visible" ? "hidden" : "visible"}>
      <div
        className={cn(
          "z-2",
          // sticky > absolute container trick. To place children like fixed but relative to parent
          //   -> "sticky" place parent in container flow width constraint, but reserve space
          //   -> "h-0" to remove the reserver space and act like it's a relative fixed container
          //   -> "top-0" to be always on viewport top while width/horizontal layout still controlled by parent.
          "sticky top-0 h-0",
          // on desktop we need to compensate for sidebar inset top (size:2) to avoid layout jump
          "md:-mt-2 md:h-2"
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            // cosmetic
            "bg-background",
            // positioning > absolute container trick
            //   -> "absolute" will be relative to sticky top parent, so always top of viewport
            //   -> "inset-x-0" keep is full parent width
            //   -> "top-0 h-screen" sticky parent is top, so be place top and expend height to bottom of viewport
            "absolute inset-x-0 top-0 h-screen",
            // children layout
            "flex items-center justify-center",
            // transition (duration and easy are procedurally controlled by style state)
            "transition-opacity",
            // layout optimizations
            "will-change-opacity contain-strict",
            // procedural
            destination.phase === "hidden" ? "opacity-100" : "opacity-0",
            destination.hidden ? "pointer-events-auto" : "pointer-events-none",
            "duration-[calc(var(--duration,5000ms)*2)] md:duration-(--duration,5000ms)",
            "ease-(--easing)"
          )}
          style={style}
        >
          {/* Spinner has delay before visible to only show on slow devices */}
          <div
            className={cn(
              // we delay spinning apparition to avoid spinner on snappy devices
              "animate-opacity-in fill-mode-backwards transition-opacity delay-300",
              // procedural
              destination.phase === "hidden" ? "opacity-100" : "opacity-0",
              "duration-[calc(var(--duration,5000ms)*4)] md:duration-[calc(var(--duration,5000ms)*2)]",
              "ease-(--easing)"
            )}
            style={style}
          >
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </Activity>
  );
}
