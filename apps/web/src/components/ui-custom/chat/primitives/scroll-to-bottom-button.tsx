import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ScrollToBottomButtonProps = ComponentProps<typeof Button> & {
  isAtBottom: boolean;
  onScrollToBottom: () => void;
};

export function ScrollToBottomButton({
  isAtBottom,
  onScrollToBottom,
  className,
  children,
  ...props
}: ScrollToBottomButtonProps) {
  if (isAtBottom) return null;

  const handleClick: ComponentProps<typeof Button>["onClick"] = (event) => {
    props.onClick?.(event);
    if (event.defaultPrevented) return;
    onScrollToBottom();
  };

  return (
    <Button
      className={cn(
        "h-9 w-9 rounded-full shadow-md backdrop-blur-md",
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
