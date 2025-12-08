import type { ComponentProps } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type UnreadDividerProps = ComponentProps<"div"> & {
  count?: number;
  label?: string;
};

export function UnreadDivider({
  className,
  count,
  label = "Unread messages",
  ...props
}: UnreadDividerProps) {
  return (
    <Separator
      className={cn(
        "flex items-center justify-center gap-3 text-muted-foreground text-xs",
        className
      )}
      role="separator"
      {...props}
    >
      {/* <span aria-hidden className="h-px flex-1" /> */}
      <span className="rounded-full bg-muted px-3 py-1 font-medium">
        {label}
        {typeof count === "number" && count > 0 ? ` · ${count}` : null}
      </span>
      {/* <span aria-hidden className="h-px flex-1" /> */}
    </Separator>
  );
}
