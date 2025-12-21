import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ScrollToBottomButtonProps = ComponentProps<typeof Button> & {
  onClick?: ComponentProps<typeof Button>["onClick"];
};

export function ScrollToBottomButton({
  onClick,
  className,
  children,
  ...props
}: ScrollToBottomButtonProps) {
  const handleClick: ComponentProps<typeof Button>["onClick"] = (event) => {
    onClick?.(event);
  };

  return (
    <Button
      className={cn(
        "size-8 rounded-full shadow-md backdrop-blur-md",
        "border border-border/60 bg-background/70",
        "flex items-center justify-center",
        className
      )}
      onClick={handleClick}
      size="icon"
      type="button"
      variant="secondary"
      {...props}
      aria-label={props["aria-label"] ?? "Scroll to bottom"}
    >
      {children ?? <ArrowDownIcon className="size-4" />}
    </Button>
  );
}
