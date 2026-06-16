import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAppReadyState } from "@/hooks/chat/app-ready/app-ready-visibility";
import { yieldNextPaint } from "@/lib/schedule-work";
import { cn } from "@/lib/utils";

const VIEWPORT_SCROLLBAR_HIDDEN_ATTR = "data-app-ready-hide-viewport-scrollbar";

export function ConversationReadyOverlay() {
  const surfaceState = useAppReadyState("conversation");
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parentEL = parentRef.current;
    if (!parentEL) return;

    parentEL.style.setProperty("--duration", `${surfaceState.durationMs}ms`);
    parentEL.style.setProperty("--easing", surfaceState.easing);
    parentEL.toggleAttribute("data-hidden", surfaceState.hidden);
  }, [surfaceState]);

  useEffect(() => {
    (async () => {
      const root = document.documentElement;
      // delay scroll bar show back one frame late to avoid safari scrollbar flicker
      if (!surfaceState.hidden) await yieldNextPaint();
      root.toggleAttribute(VIEWPORT_SCROLLBAR_HIDDEN_ATTR, surfaceState.hidden);
      //! Do not but anything below or scope the yieldNextPaint to only affect scrollbar reveal toggle
    })();
  }, [surfaceState]);

  return (
    <div
      className={cn(
        "z-2",
        "sticky top-0 h-0",
        "md:-mt-2 md:h-2",
        "group/overlay"
      )}
      data-hidden={surfaceState.hidden}
      id="overlay-conversation"
      ref={parentRef}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-screen",
          "flex items-center justify-center",
          "bg-background",
          "transition-opacity",
          "will-change-opacity contain-strict",
          "pointer-events-none opacity-0",
          "group-data-hidden/overlay:pointer-events-auto",
          "group-data-hidden/overlay:opacity-100",
          "duration-[calc(var(--duration,0ms)*2)] md:duration-(--duration,0ms)",
          "ease-(--easing)"
        )}
      >
        <div
          className={cn(
            "z-2 opacity-0 transition-opacity ease-snappy",
            "group-data-hidden/overlay:animate-opacity-in",
            "group-data-hidden/overlay:fill-mode-backward",
            "group-data-hidden/overlay:opacity-100",
            "group-data-hidden/overlay:delay-800",
            "group-data-hidden/overlay:duration-(--duration-slow)"
          )}
        >
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
