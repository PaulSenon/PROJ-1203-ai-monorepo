"use client";

import { BrainIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  const [open, setOpen] = useState(false);
  const isDisabled = Boolean(disabled);
  const isOpen = !isDisabled && open;

  useEffect(() => {
    if (isDisabled) {
      setOpen(false);
    }
  }, [isDisabled]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isDisabled) {
      return;
    }

    setOpen(nextOpen);
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
  label: ReactNode;
  className?: string;
  disabled?: boolean;
};

function ReasoningTrigger({
  label,
  className,
  disabled = false,
}: ReasoningTriggerProps) {
  const { disabled: rootDisabled } = useReasoningContext();
  const isDisabled = rootDisabled || disabled;

  return (
    <CollapsibleTrigger
      className={cn(
        "group flex min-h-6 w-full items-center gap-2 text-muted-foreground text-sm",
        "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "data-disabled:cursor-not-allowed data-disabled:opacity-60",
        className
      )}
      disabled={isDisabled}
      type="button"
    >
      <BrainIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      <ChevronRightIcon
        aria-hidden="true"
        className="ml-auto size-4 shrink-0 transition-transform group-data-disabled:invisible group-data-[state=open]:rotate-90"
      />
    </CollapsibleTrigger>
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
  const { isOpen, isStreaming, disabled } = useReasoningContext();

  const previewStyle = useMemo(
    () => ({
      height: `${lines * PREVIEW_LINE_HEIGHT_REM}rem`,
      minHeight: `${lines * PREVIEW_LINE_HEIGHT_REM}rem`,
      maskImage:
        "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
      WebkitMaskImage:
        "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
    }),
    [lines]
  );

  if (disabled || isOpen || !isStreaming || isEmptyChildren(children)) {
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
  const { isOpen, disabled } = useReasoningContext();

  if (disabled || !isOpen || isEmptyChildren(children)) {
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
