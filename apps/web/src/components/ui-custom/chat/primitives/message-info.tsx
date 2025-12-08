import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChatMessageInfoProps = ComponentProps<"div"> & {
  icon?: ReactNode;
  label?: ReactNode;
};

export function ChatMessageInfo({
  className,
  icon,
  label,
  children,
  ...props
}: ChatMessageInfoProps) {
  return (
    <div
      className={cn("flex items-center gap-1 text-xs", className)}
      {...props}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground">{label ?? children}</span>
    </div>
  );
}
