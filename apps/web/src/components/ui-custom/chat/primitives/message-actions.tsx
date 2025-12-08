import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ChatMessageActionsProps = ComponentProps<"div">;

export function ChatMessageActions({
  className,
  children,
  ...props
}: ChatMessageActionsProps) {
  return (
    <div
      className={cn("flex flex-row flex-wrap items-center gap-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}
