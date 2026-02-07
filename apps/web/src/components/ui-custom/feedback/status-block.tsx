import { type ComponentProps, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

export type StatusBlockKind = "info" | "warning" | "error" | "debug";

export type StatusBlockRootProps = ComponentProps<"div"> & {
  kind?: StatusBlockKind;
};

const StatusBlockKindContext = createContext<StatusBlockKind>("info");

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
    <StatusBlockKindContext.Provider value={kind}>
      <div
        className={cn(
          "flex w-full flex-wrap items-start gap-x-3 gap-y-2 rounded-md border px-3 py-2.5 text-foreground text-sm",
          kindStyles[kind],
          className
        )}
        data-kind={kind}
        {...props}
      />
    </StatusBlockKindContext.Provider>
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

function StatusBlockContent({
  className,
  role,
  "aria-live": ariaLive,
  ...props
}: StatusBlockContentProps) {
  const kind = useContext(StatusBlockKindContext);
  const isError = kind === "error";

  return (
    <div
      aria-live={ariaLive ?? (isError ? "assertive" : "polite")}
      className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}
      role={role ?? (isError ? "alert" : "status")}
      {...props}
    />
  );
}

export type StatusBlockTitleProps = ComponentProps<"h4">;

function StatusBlockTitle({ className, ...props }: StatusBlockTitleProps) {
  return (
    <h4
      className={cn(
        "font-medium text-foreground text-sm tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export type StatusBlockBodyProps = ComponentProps<"p">;

function StatusBlockBody({ className, ...props }: StatusBlockBodyProps) {
  return (
    <p
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

export type StatusBlockActionsProps = ComponentProps<"div">;

function StatusBlockActions({ className, ...props }: StatusBlockActionsProps) {
  return (
    <div
      className={cn(
        "mt-0.5 flex basis-full flex-wrap items-center gap-2 border-border/50 border-t pt-2 pl-0.5",
        className
      )}
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
