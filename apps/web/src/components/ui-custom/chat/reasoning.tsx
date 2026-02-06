"use client";

import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type ReasoningRootProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
};

function ReasoningRoot({
  className,
  isStreaming = false,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled,
  children,
  ...props
}: ReasoningRootProps) {
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = isControlled ? open : uncontrolledOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <Collapsible
      className={cn("not-prose", className)}
      data-streaming={isStreaming ? "true" : "false"}
      disabled={disabled}
      onOpenChange={handleOpenChange}
      open={isOpen}
      {...props}
    >
      {children}
    </Collapsible>
  );
}

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

function ReasoningTrigger({ className, ...props }: ReasoningTriggerProps) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex min-h-6 w-full items-center gap-2 text-muted-foreground text-sm",
        "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "data-disabled:cursor-not-allowed data-disabled:opacity-60",
        className
      )}
      type="button"
      {...props}
    />
  );
}

export type ReasoningPreviewProps = ComponentProps<"div"> & {
  lines?: number;
};

const DEFAULT_PREVIEW_LINES = 2;
const PREVIEW_LINE_HEIGHT_REM = 1.25;

function ReasoningPreview({
  className,
  lines = DEFAULT_PREVIEW_LINES,
  children,
  ...props
}: ReasoningPreviewProps) {
  const previewStyle = useMemo(
    () =>
      ({
        height: `${lines * PREVIEW_LINE_HEIGHT_REM}rem`,
        minHeight: `${lines * PREVIEW_LINE_HEIGHT_REM}rem`,
        maskImage:
          "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
      }) satisfies CSSProperties,
    [lines]
  );

  if (isEmptyChildren(children)) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative mt-1 overflow-hidden text-muted-foreground text-xs leading-5",
        className
      )}
      style={previewStyle}
      {...props}
    >
      <div className="absolute inset-x-0 bottom-0 whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent>;

function ReasoningContent({
  className,
  children,
  ...props
}: ReasoningContentProps) {
  if (isEmptyChildren(children)) {
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

function isEmptyChildren(children: ReactNode) {
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
