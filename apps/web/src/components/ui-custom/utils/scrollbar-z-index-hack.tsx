import { cn } from "@/lib/utils";

/**
 * Put this inside a scroll container if you need to bump z-index of the scrollbar.
 * Because scrollbar z-index is always the max z-index of the container.
 * But you might want to bump the z-index of the scrollbar to be higher than the container.
 * (e.g. you have some fixed elements covering the scrollbar)
 * So this basically create a dummy element with the desired z-index to bump the scrollbar z-index.
 *
 * @example
 * ```tsx
 * // this header must appear on top of EVERY items inside the scroll container
 * // including the fixed button, but must remain underneath the scrollbar z-index
 * <div className="fixed bottom-0 right-0 z-20">
 *   <h2> Header </h2>
 * </div>
 *
 * <div className="overflow-scroll">
 *   // this dummy element will bump the scrollbar z-index to 30 while keeping the button
 *   // z-index underneath our header z-index
 *   <ScrollbarZIndexHack zIndex={30} />
 *
 *   <div className="h-100">
 *     <p>Hello</p>
 *     <p>World</p>
 *     // this button must appear on top of items inside the scroll container
 *     <button className="fixed bottom-0 right-0 z-10">Click me</button>
 *   </div>
 * </div>
 * ```
 */
export function ScrollbarZIndexHack({ zIndex }: { zIndex: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none h-0 opacity-0")}
      style={{ zIndex }}
    />
  );
}
