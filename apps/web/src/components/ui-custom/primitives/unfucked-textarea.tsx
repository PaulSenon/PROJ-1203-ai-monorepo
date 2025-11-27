import { useCallback, useEffect, useRef } from "react";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { cn, mergeRefs } from "@/lib/utils";

/**
 * Goal: make auto grow/shrink work on ios because shadcn primitive doesn't even cover that
 * basic case.
 * This is mostly a polyfill/hack for safari.
 */
type UnfuckedTextareaProps = React.ComponentProps<typeof ShadcnTextarea> & {
  resizable?: boolean;
};
export function UnfuckedTextarea({
  className,
  resizable = false,
  value,
  ref,
  ...props
}: UnfuckedTextareaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    // disable if manually resizeable
    if (resizable) return;
    const textarea = internalRef.current;
    if (!textarea) return;

    const computed = getComputedStyle(textarea);
    const minHeight = Number.parseInt(computed.minHeight, 10) || 0;
    const maxHeight =
      Number.parseInt(computed.maxHeight, 10) || Number.POSITIVE_INFINITY;

    // Reset to auto to get true scrollHeight (critical for shrinking)
    textarea.style.height = "auto";
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight
    );
    textarea.style.height = `${newHeight}px`;

    // Show scrollbar only when content exceeds max
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [resizable]);

  // Resize on value change (controlled) and on input (uncontrolled)
  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to react on external value changes
  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <ShadcnTextarea
      className={cn(
        className,
        resizable ? "resize-y overflow-y-auto" : "resize-none"
      )}
      onInput={resize}
      ref={mergeRefs(internalRef, ref)}
      value={value}
      {...props}
    />
  );
}

/* copy paste from shadcn input-group.tsx */
export function InputGroupUnfuckedTextarea({
  className,
  ...props
}: React.ComponentProps<typeof UnfuckedTextarea>) {
  return (
    <UnfuckedTextarea
      className={cn(
        "resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      data-slot="input-group-control"
      {...props}
    />
  );
}
