import { useSmoothText } from "@convex-dev/agent/react";
import { BrainIcon, ChevronRightIcon } from "lucide-react";
import { type ComponentProps, memo, useState } from "react";
import { Streamdown } from "streamdown";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ThinkingBlockProps = ComponentProps<"div"> & {
  /** Whether content is still streaming */
  isStreaming?: boolean;
  /** Duration in seconds (shown when not streaming) */
  duration?: number;
  /** The thinking content (markdown) */
  children: string;
  /** Default open state - defaults to false (collapsed) */
  defaultOpen?: boolean;
};

// ============================================================================
// Sub-components
// ============================================================================

type ThinkingTriggerProps = {
  isStreaming: boolean;
  duration?: number;
  isOpen: boolean;
};

function ThinkingTrigger({
  isStreaming,
  duration,
  isOpen,
}: ThinkingTriggerProps) {
  const getMessage = () => {
    if (isStreaming) {
      return <Shimmer duration={1}>Thinking...</Shimmer>;
    }
    if (duration === undefined || duration === 0) {
      return <span>Thought for a few seconds</span>;
    }
    return <span>Thought for {duration}s</span>;
  };

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center gap-2 text-muted-foreground text-sm",
        "transition-colors hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "rounded-md py-1"
      )}
    >
      <BrainIcon className="size-4 shrink-0" />
      {getMessage()}
      <ChevronRightIcon
        className={cn(
          "ml-auto size-4 shrink-0 transition-transform duration-200",
          isOpen && "rotate-90"
        )}
      />
    </CollapsibleTrigger>
  );
}

const ThinkingContent = memo(
  ({
    className,
    children,
    ...props
  }: ComponentProps<typeof CollapsibleContent> & { children: string }) => (
    <CollapsibleContent
      className={cn(
        "overflow-hidden",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:animate-in",
        className
      )}
      {...props}
    >
      <div className="pt-2 pb-1">
        <Streamdown
          className={cn(
            "text-muted-foreground text-sm",
            "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          )}
        >
          {children}
        </Streamdown>
      </div>
    </CollapsibleContent>
  )
);

ThinkingContent.displayName = "ThinkingContent";

// ============================================================================
// Main Component
// ============================================================================

export const ThinkingBlock = memo(
  ({
    className,
    isStreaming = false,
    duration,
    defaultOpen = false,
    children,
    ...props
  }: ThinkingBlockProps) => {
    // Fully controlled by user - no auto-open/close to prevent CLS
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [text] = useSmoothText(children as string);

    return (
      <div className={cn("not-prose", className)} {...props}>
        <Collapsible onOpenChange={setIsOpen} open={isOpen}>
          <ThinkingTrigger
            duration={duration}
            isOpen={isOpen}
            isStreaming={isStreaming}
          />
          <ThinkingContent>{text}</ThinkingContent>
        </Collapsible>
      </div>
    );
  }
);

ThinkingBlock.displayName = "ThinkingBlock";
