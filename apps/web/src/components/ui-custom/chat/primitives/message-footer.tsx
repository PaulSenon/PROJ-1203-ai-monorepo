import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ChatMessageFooterProps = ComponentProps<"div"> & {
  revealOnHover?: boolean;
  stackOnMobile?: boolean;
};

export function ChatMessageFooter({
  className,
  children,
  revealOnHover = true,
  stackOnMobile = true,
  ...props
}: ChatMessageFooterProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-2 text-muted-foreground text-xs",
        stackOnMobile && "flex-col items-start sm:flex-row sm:items-center",
        revealOnHover &&
          "opacity-0 transition-opacity duration-(--duration-fast) ease-(--ease-default) group-focus-within:opacity-100 group-hover:opacity-100 group-has-data-[state='open']:opacity-100",
        "print:hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
