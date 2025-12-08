import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ChatMessageInfosProps = ComponentProps<"div"> & {
  hideOnMobile?: boolean;
};

export function ChatMessageInfos({
  className,
  children,
  hideOnMobile = true,
  ...props
}: ChatMessageInfosProps) {
  return (
    <div
      className={cn(
        "flex flex-row flex-wrap items-center gap-3 text-muted-foreground text-xs",
        hideOnMobile && "hidden sm:flex",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
