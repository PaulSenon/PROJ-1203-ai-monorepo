import { useSmoothText } from "@convex-dev/agent/react";
import { BrainIcon, ChevronRightIcon } from "lucide-react";
import {
  type ComponentProps,
  type CSSProperties,
  memo,
  useMemo,
  useState,
} from "react";
import { Streamdown } from "streamdown";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatDurationMs } from "@/lib/format-duration";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ThinkingBlockProps = ComponentProps<"div"> & {
  /** Whether content is still streaming */
  isStreaming?: boolean;
  /** Duration in milliseconds (shown when not streaming) */
  durationMs?: number;
  /** The thinking content (markdown) */
  children: string;
  /** Default open state - defaults to false (collapsed) */
  defaultOpen?: boolean;
  /** Preview line count (collapsed streaming) */
  previewLines?: number;
  /** Whether response text exists yet */
  hasResponseText?: boolean;
};

// ============================================================================
// Sub-components
// ============================================================================

const DEFAULT_PREVIEW_LINES = 2;
const PREVIEW_LINE_HEIGHT_REM = 1.25;

function getHeaderLabel({
  isStreaming,
  hasResponseText,
  durationMs,
}: {
  isStreaming: boolean;
  hasResponseText: boolean;
  durationMs: number | undefined;
}) {
  if (isStreaming && !hasResponseText) {
    return (
      <Shimmer as="span" duration={1}>
        Reasoning...
      </Shimmer>
    );
  }
  const formatted = formatDurationMs(durationMs);
  if (!formatted) {
    return <span>Thought for a few seconds</span>;
  }
  return <span>Thought for {formatted}</span>;
}

// ============================================================================
// Main Component
// ============================================================================

export const ThinkingBlock = memo(
  ({
    className,
    isStreaming = false,
    durationMs,
    defaultOpen = false,
    previewLines = DEFAULT_PREVIEW_LINES,
    hasResponseText = false,
    children,
    ...props
  }: ThinkingBlockProps) => {
    // Fully controlled by user - no auto-open/close to prevent CLS
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [text] = useSmoothText(children as string);
    const showPreview = !isOpen && isStreaming && !hasResponseText;

    const previewStyle = useMemo(
      () =>
        ({
          height: `${previewLines * PREVIEW_LINE_HEIGHT_REM}rem`,
          minHeight: `${previewLines * PREVIEW_LINE_HEIGHT_REM}rem`,
          maskImage:
            "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
        }) satisfies CSSProperties,
      [previewLines]
    );

    return (
      <div className={cn("not-prose", className)} {...props}>
        <Collapsible onOpenChange={setIsOpen} open={isOpen}>
          <CollapsibleTrigger
            aria-label="Toggle reasoning"
            className={cn(
              "flex min-h-6 w-full gap-2 text-muted-foreground text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "rounded-md"
            )}
            type="button"
          >
            <BrainIcon className="size-4 shrink-0" />
            <span className="truncate">
              {getHeaderLabel({ isStreaming, hasResponseText, durationMs })}
            </span>
            <ChevronRightIcon
              className={cn("ml-auto size-4 shrink-0", isOpen && "rotate-90")}
            />
          </CollapsibleTrigger>
          {showPreview && (
            <div
              className={cn(
                "relative mt-1 overflow-hidden text-muted-foreground text-xs leading-5"
              )}
              style={previewStyle}
            >
              <div className="absolute inset-x-0 bottom-0 whitespace-pre-wrap">
                {text}
              </div>
            </div>
          )}
          <CollapsibleContent className="mt-2">
            <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2">
              <Streamdown
                className={cn(
                  "text-muted-foreground text-sm",
                  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                )}
              >
                {text}
              </Streamdown>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }
);

ThinkingBlock.displayName = "ThinkingBlock";
