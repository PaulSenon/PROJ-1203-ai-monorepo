import { cn } from "@/lib/utils";

/**
 * Custom implementation based on Josh Comeau's amazing work here:
 * https://www.joshwcomeau.com/css/backdrop-filter/
 */
export function BackdropBlurGlassEdge({
  position,
  className,
  thickness = "3px",
  visible = true,
}: {
  position: "top" | "bottom";
  fadeSize?: string;
  className?: string;
  thickness?: string;
  visible?: boolean;
}) {
  return (
    <>
      {/* background color */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 h-full max-h-screen bg-sidebar transition-opacity duration-(--duration-fast) ease-(--ease-default)",
          position === "top" && "top-0",
          position === "bottom" && "bottom-0",
          visible ? "opacity-0" : "opacity-100",
          className
        )}
      />

      {/* bleeding backdrop blur */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 h-[200%] max-h-screen contrast-more saturate-200 backdrop-blur-lg",
          position === "top" && "top-0",
          position === "bottom" && "bottom-0",
          visible ? "opacity-100" : "opacity-0",
          className
        )}
        style={
          {
            maskImage: `linear-gradient(to ${position === "top" ? "bottom" : "top"},black 0,black 50%,transparent 50%)`,
          } as React.CSSProperties
        }
      />

      {/* glass edge */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 m-0 h-0 p-0",
          position === "top" && "bottom-0",
          position === "bottom" && "top-0"
          // ,"h-[3px] bg-red-500/50"
        )}
        style={
          {
            "--thickness": thickness,
          } as React.CSSProperties
        }
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 h-[200px] max-h-screen brightness-100 saturate-200 backdrop-blur-md transition-all duration-(--duration-fast) ease-(--ease-default)",
            visible ? "opacity-100 brightness-150" : "opacity-0 brightness-100",
            position === "top" && "top-0",
            position === "bottom" && "bottom-0"
          )}
          style={
            {
              "--thickness": thickness,
              maskImage: `linear-gradient(to ${position === "top" ? "bottom" : "top"},black 0,black var(--thickness),transparent var(--thickness)), linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)`,
              WebkitMaskImage: `linear-gradient(to ${position === "top" ? "bottom" : "top"},black 0,black var(--thickness),transparent var(--thickness)), linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)`,
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            } as React.CSSProperties
          }
        />
      </div>

      {/* fade mask */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 left-0 m-0 h-full max-h-8 p-0",
          position === "top" && "top-0",
          position === "bottom" && "bottom-0"
          // ,"bg-red-500/50"
        )}
        style={
          {
            background: `linear-gradient(
              to ${position === "top" ? "bottom" : "top"},
              color-mix(in srgb, var(--sidebar) 100%, transparent) 0%,
              color-mix(in srgb, var(--sidebar) 90%, transparent) 30%,
              color-mix(in srgb, var(--sidebar) 50%, transparent) 70%,
              transparent 100%
            )`,
          } as React.CSSProperties
        }
      />
    </>
  );
}
