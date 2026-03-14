import { useMemo } from "react";
import { useAppReadyUiDestination } from "@/hooks/use-app-ready";

export function ConversationReadyOverlay() {
  const destination = useAppReadyUiDestination("conversation-content");

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
