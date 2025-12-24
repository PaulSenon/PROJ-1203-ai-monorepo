import { Slot } from "@radix-ui/react-slot";
import {
  TooltipContent as TooltipContentPrimitive,
  Tooltip as TooltipPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function TooltipContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof TooltipContentPrimitive>) {
  return (
    <TooltipContentPrimitive
      alignOffset={10}
      arrow={false}
      className={cn(
        "wrap-break-word max-h-[var(--radix-tooltip-content-available-height)]whitespace-normal max-w-(--radix-tooltip-content-available-width) overflow-auto",
        "pointer-events-none select-none bg-sidebar text-foreground text-xs md:bg-background",
        className
      )}
      collisionPadding={10}
      side="bottom"
      // sticky="always"
      {...props}
    >
      {children}
    </TooltipContentPrimitive>
  );
}

export function Tooltip({
  children,
  tooltip,
  isMobile = false,
  asChild = false,
}: {
  children: React.ReactNode;
  tooltip?: string;
  isMobile: boolean;
  asChild?: boolean;
}) {
  if (isMobile) {
    return children;
  }

  const Comp = asChild ? Slot : "div";
  return (
    <TooltipPrimitive>
      <TooltipTriggerPrimitive asChild>
        <Comp>{children}</Comp>
      </TooltipTriggerPrimitive>
      <TooltipContent>{tooltip}</TooltipContent>
    </TooltipPrimitive>
  );
}
