import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type StatusBlockKind = "info" | "warning" | "error" | "debug";

export type StatusBlockRootProps = ComponentProps<"div"> & {
  kind?: StatusBlockKind;
};

const kindStyles: Record<StatusBlockKind, string> = {
  info: "border-border/60 bg-muted/30",
  warning: "border-amber-500/30 bg-amber-500/5",
  error: "border-destructive/35 bg-destructive/5",
  debug: "border-sky-500/30 bg-sky-500/5",
};

function StatusBlockRoot({
  className,
  kind = "info",
  ...props
}: StatusBlockRootProps) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-foreground text-sm",
        kindStyles[kind],
        className
      )}
      data-kind={kind}
      {...props}
    />
  );
}

export type StatusBlockIconProps = ComponentProps<"div">;

function StatusBlockIcon({ className, ...props }: StatusBlockIconProps) {
  return (
    <div
      className={cn("mt-0.5 shrink-0 text-muted-foreground", className)}
      {...props}
    />
  );
}

export type StatusBlockContentProps = ComponentProps<"div">;

function StatusBlockContent({ className, ...props }: StatusBlockContentProps) {
  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}
      {...props}
    />
  );
}

export type StatusBlockTitleProps = ComponentProps<"h4">;

function StatusBlockTitle({ className, ...props }: StatusBlockTitleProps) {
  return <h4 className={cn("font-medium text-sm", className)} {...props} />;
}

export type StatusBlockBodyProps = ComponentProps<"p">;

function StatusBlockBody({ className, ...props }: StatusBlockBodyProps) {
  return (
    <p className={cn("text-muted-foreground text-sm", className)} {...props} />
  );
}

export type StatusBlockActionsProps = ComponentProps<"div">;

function StatusBlockActions({ className, ...props }: StatusBlockActionsProps) {
  return (
    <div
      className={cn("mt-1 flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}

export const StatusBlock = {
  Root: StatusBlockRoot,
  Icon: StatusBlockIcon,
  Content: StatusBlockContent,
  Title: StatusBlockTitle,
  Body: StatusBlockBody,
  Actions: StatusBlockActions,
};
