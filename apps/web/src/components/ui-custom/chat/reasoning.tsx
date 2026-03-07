"use client";

import { BrainIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIntersectionObserver } from "@/hooks/utils/use-intersection-observer";
import { cn } from "@/lib/utils";

export type ReasoningRootProps = {
  children: ReactNode;
  className?: string;
  isStreaming?: boolean;
  disabled?: boolean;
};

type ReasoningContextValue = {
  isOpen: boolean;
  isStreaming: boolean;
  disabled: boolean;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

function useReasoningContext() {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning.Root");
  }
  return context;
}

function ReasoningRoot({
  className,
  isStreaming = false,
  disabled = false,
  children,
}: ReasoningRootProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDisabled = Boolean(disabled);
  const isOpen = !isDisabled && isExpanded;

  useEffect(() => {
    if (isDisabled) {
      setIsExpanded(false);
    }
  }, [isDisabled]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isDisabled) {
      return;
    }

    setIsExpanded(nextOpen);
  };

  const contextValue = useMemo(
    () => ({ isOpen, isStreaming, disabled: isDisabled }),
    [isDisabled, isOpen, isStreaming]
  );

  return (
    <ReasoningContext.Provider value={contextValue}>
      <Collapsible
        className={cn("not-prose", className)}
        data-streaming={isStreaming ? "true" : "false"}
        disabled={isDisabled}
        onOpenChange={handleOpenChange}
        open={isOpen}
      >
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  );
}

export type ReasoningTriggerProps = {
  label?: ReactNode;
  className?: string;
  disabled?: boolean;
};

const DEFAULT_REASONING_LABEL = "Thought for a few seconds";
const STREAMING_REASONING_LABEL = "Reasoning...";
const STREAMING_REASONING_SR_LABEL = "Reasoning in progress";

function ReasoningTrigger({
  label,
  className,
  disabled = false,
}: ReasoningTriggerProps) {
  const { disabled: rootDisabled, isStreaming } = useReasoningContext();
  const isDisabled = rootDisabled || disabled;
  const resolvedLabel = label ?? DEFAULT_REASONING_LABEL;

  return (
    <CollapsibleTrigger
      className={cn(
        "group flex min-h-6 w-full items-center gap-2 text-muted-foreground text-sm",
        "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      disabled={isDisabled}
      type="button"
    >
      <BrainIcon aria-hidden="true" className="size-4 shrink-0" />
      {isStreaming ? (
        <>
          <span aria-hidden="true" className="truncate">
            <Shimmer as="span" duration={1}>
              {STREAMING_REASONING_LABEL}
            </Shimmer>
          </span>
          <span className="sr-only">{STREAMING_REASONING_SR_LABEL}</span>
        </>
      ) : (
        <span className="truncate">{resolvedLabel}</span>
      )}
      <ChevronRightIcon
        aria-hidden="true"
        className="ml-auto size-4 shrink-0 transition-transform group-data-disabled:invisible group-data-[state=open]:rotate-90"
      />
    </CollapsibleTrigger>
  );
}

type ReasoningPreviewStyle = CSSProperties & {
  "--reasoning-preview-lines": number;
  "--reasoning-preview-line-height": string;
};

export type ReasoningPreviewProps = {
  className?: string;
  lines?: number;
  children?: string;
};

const DEFAULT_PREVIEW_LINES = 2;
const PREVIEW_LINE_HEIGHT_REM = 1.25;
const MAX_PREVIEW_CHARS = 1200;

function getBoundedPreviewText(text: string) {
  if (text.length <= MAX_PREVIEW_CHARS) {
    return {
      text,
      isTruncated: false,
    };
  }

  return {
    text: text.slice(-MAX_PREVIEW_CHARS).trimStart(),
    isTruncated: true,
  };
}

function ReasoningPreview({
  className,
  lines = DEFAULT_PREVIEW_LINES,
  children,
}: ReasoningPreviewProps) {
  const { isOpen, isStreaming, disabled } = useReasoningContext();
  const text = children ?? "";
  const preview = useMemo(() => getBoundedPreviewText(text), [text]);

  const hasText = text.trim().length > 0;
  const isCollapsed = !isOpen;
  const isEnabled = !disabled;
  const shouldRenderPreview =
    isEnabled && isCollapsed && isStreaming && hasText;

  const supportsIntersectionObserver =
    typeof IntersectionObserver !== "undefined";
  const [previewViewport, setPreviewViewport] = useState<HTMLDivElement | null>(
    null
  );
  // T6 invariant: one-way latch for this reasoning block lifecycle.
  const [hasDetectedOverflow, setHasDetectedOverflow] = useState(false);

  const flooredLines = Math.floor(lines);
  const normalizedLines =
    Number.isFinite(lines) && flooredLines >= 1
      ? flooredLines
      : DEFAULT_PREVIEW_LINES;

  const observerReady =
    supportsIntersectionObserver && previewViewport !== null;
  const shouldObserveOverflowSentinel =
    shouldRenderPreview &&
    observerReady &&
    !preview.isTruncated &&
    !hasDetectedOverflow;
  const showTopFade = preview.isTruncated || hasDetectedOverflow;
  const previewStyle: ReasoningPreviewStyle = {
    "--reasoning-preview-lines": normalizedLines,
    "--reasoning-preview-line-height": `${PREVIEW_LINE_HEIGHT_REM}rem`,
  };

  if (!shouldRenderPreview) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative mt-1 overflow-hidden text-muted-foreground text-xs",
        "leading-(--reasoning-preview-line-height)",
        "h-[calc(var(--reasoning-preview-lines)*var(--reasoning-preview-line-height))]",
        "min-h-[calc(var(--reasoning-preview-lines)*var(--reasoning-preview-line-height))]",
        className
      )}
      ref={setPreviewViewport}
      style={previewStyle}
    >
      {showTopFade ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-linear-to-b from-background to-transparent"
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 min-h-[calc(var(--reasoning-preview-lines)*var(--reasoning-preview-line-height))] whitespace-pre-wrap">
        {shouldObserveOverflowSentinel ? (
          <ReasoningOverflowSentinel
            onOverflow={() => setHasDetectedOverflow(true)}
            root={previewViewport}
          />
        ) : null}
        {preview.text}
      </div>
    </div>
  );
}

type ReasoningOverflowSentinelProps = {
  root: HTMLDivElement | null;
  onOverflow: () => void;
};

function ReasoningOverflowSentinel({
  root,
  onOverflow,
}: ReasoningOverflowSentinelProps) {
  const handleChange = useCallback(
    (entry: IntersectionObserverEntry) => {
      if (!entry.isIntersecting) {
        onOverflow();
      }
    },
    [onOverflow]
  );
  const { ref } = useIntersectionObserver<HTMLDivElement>({
    root,
    disabled: root === null,
    onChange: handleChange,
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0"
      ref={ref}
    />
  );
}

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent>;

function ReasoningContent({
  className,
  children,
  ...props
}: ReasoningContentProps) {
  const { isOpen, disabled } = useReasoningContext();

  if (disabled || !isOpen || isVisuallyEmptyChildren(children)) {
    return null;
  }

  return (
    <CollapsibleContent className={cn("mt-2", className)} {...props}>
      <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2">
        {children}
      </div>
    </CollapsibleContent>
  );
}

function isVisuallyEmptyChildren(children: ReactNode) {
  if (children == null || typeof children === "boolean") {
    return true;
  }

  if (typeof children === "string") {
    return children.trim().length === 0;
  }

  return false;
}

export const Reasoning = {
  Root: ReasoningRoot,
  Trigger: ReasoningTrigger,
  Preview: ReasoningPreview,
  Content: ReasoningContent,
};
