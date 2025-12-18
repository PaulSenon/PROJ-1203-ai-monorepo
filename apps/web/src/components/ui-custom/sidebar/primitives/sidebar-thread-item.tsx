import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { MoreVerticalIcon, PinIcon, XIcon } from "lucide-react";
import React, { Activity, useEffect, useMemo, useRef, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { Pulse2Icon } from "@/components/ui/icons/svg-spinners-pulse-2";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  type ActionMenuItem,
  GlobalContextMenuButton,
  GlobalContextMenuItem,
} from "../sidebar-context-menu";

function reduceLiveStateToIndicatorVariant(
  thread: Doc<"threads">
): LiveStateIndicatorVariant | undefined {
  if (thread.liveStatus === "pending" || thread.liveStatus === "streaming") {
    return "pending";
  }
  if (thread.liveStatus === "error") {
    return "error";
  }
  // TODO: handle unread
  if (thread.liveStatus === "completed") {
    return;
  }

  // TODO: handle need-action
}
type LiveStateIndicatorVariant = "pending" | "error" | "unread" | "need-action";
function LiveStateIndicatorIcon({
  className,
  thread,
}: {
  className?: string;
  thread: Doc<"threads">;
}) {
  const variant = reduceLiveStateToIndicatorVariant(thread);
  const isVisible = variant !== undefined;
  return (
    <div
      aria-hidden={!isVisible}
      className={cn(
        "flex items-center overflow-hidden transition-all duration-300 ease-in-out",
        isVisible
          ? "w-4 translate-x-0 overflow-visible opacity-100"
          : "-translate-x-2 w-0 opacity-0",
        className
      )}
    >
      <div aria-label={variant} className="relative mr-1 size-2" role="img">
        <span
          className={cn(
            "absolute inset-0 size-2 origin-center rounded-full transition-all duration-200 ease-in-out",
            variant === "unread" && "bg-sidebar-primary",
            variant === "error" && "bg-destructive",
            variant === "need-action" && "animate-pulse bg-sidebar-primary",
            variant === "pending" &&
              "animation-duration-1800 animate-pulse bg-muted-foreground"
          )}
        />
        {variant === "pending" && (
          <Pulse2Icon
            className="-left-1/2 -top-1/2 absolute origin-center animate-in text-muted-foreground/80"
            size={16}
          />
        )}
      </div>
    </div>
  );
}

export function SidebarThreadActionButton({
  icon: Icon,
  label,
  onClick,
  className,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: "default" | "destructive";
}) {
  return (
    <Button
      className={cn(
        "h-7 w-7 rounded-md bg-transparent p-1.5 text-foreground hover:text-foreground",
        variant === "default" &&
          "hover:bg-sidebar-ring/50 hover:text-accent-foreground",
        variant === "destructive" &&
          "hover:bg-destructive/50 hover:text-accent-foreground",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(e);
      }}
      size="icon"
      tabIndex={-1}
      variant={"default"}
    >
      <Icon className="size-4" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function TruncatedText({
  text,
  className,
  skeletonWidth = "w-3/4",
  shimmer,
}: {
  text?: string;
  className?: string;
  skeletonWidth?: string;
  shimmer?: boolean;
}) {
  if (text === undefined) {
    return <Skeleton className={cn("h-5", skeletonWidth, className)} />;
  }

  // TODO: shimmer text does not ellipsis, and when it does the animation is broken (jumps)
  return (
    <span
      className={cn(
        "block max-w-full overflow-hidden truncate text-ellipsis whitespace-nowrap",
        className
      )}
    >
      {shimmer ? <Shimmer>{text}</Shimmer> : text}
    </span>
  );
}

type QuickActionItem = Omit<ActionMenuItem, "onSelect"> & {
  onClick: (e: React.MouseEvent) => void;
};

function SidebarChatLinkQuickActions({
  actions,
}: {
  actions: QuickActionItem[];
}) {
  if (actions.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-1 p-1">
      {actions.map((action) => (
        <SidebarThreadActionButton
          className="shrink-0"
          icon={action.icon as React.ElementType}
          key={action.id}
          label={action.label}
          onClick={(e) => {
            action.onClick?.(e);
          }}
          variant={action.variant === "destructive" ? "destructive" : "default"}
        />
      ))}
    </div>
  );
}

export function _SidebarChatLink({
  thread,
  isActive = false,
  className,
  isMobile = false,
  prerender = false,
}: {
  thread: Doc<"threads">;
  isActive?: boolean;
  className?: string;
  isMobile?: boolean;
  prerender?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(prerender);
  const ref = useRef<HTMLLIElement>(null);
  const isLoading =
    thread.liveStatus === "pending" || thread.liveStatus === "streaming";
  const tooltip = thread.title || "Loading title";

  const quickActions: QuickActionItem[] = useMemo(
    () => [
      {
        id: "pin-thread",
        icon: PinIcon,
        label: "Pin thread",
        onClick: () => console.log("Pin thread", thread.title),
      },
      {
        id: "delete-thread",
        icon: XIcon,
        label: "Delete thread",
        onClick: () => console.log("Delete thread", thread.title),
        variant: "destructive",
      },
    ],
    [thread]
  );

  useEffect(() => {
    if (prerender) return;

    const cb = (e: Event) => {
      if (!(e instanceof ContentVisibilityAutoStateChangeEvent)) return;
      if (!e.skipped) {
        ref.current?.removeEventListener(
          "contentvisibilityautostatechange",
          cb
        );
        setIsVisible(true);
      }
      // setIsVisible(!e.skipped);
    };
    ref.current?.addEventListener("contentvisibilityautostatechange", cb);
    return () => {
      ref.current?.removeEventListener("contentvisibilityautostatechange", cb);
    };
  }, [prerender]);

  return (
    <GlobalContextMenuItem asChild data={thread}>
      <SidebarMenuItem
        className={cn(
          "min-h-10 select-none md:min-h-9",
          "group/item transition-transform duration-50 ease-subtle-overshoot data-[cm-selected=true]:z-9999 data-[cm-selected=true]:scale-105 md:data-[cm-selected=true]:scale-none",
          className
        )}
        ref={ref}
        style={{
          contain: "layout style",
          contentVisibility: "auto",
          containIntrinsicBlockSize: "auto 40px",
        }}
        title={tooltip}
      >
        <Activity mode={isVisible ? "visible" : "hidden"}>
          <SidebarMenuButton
            asChild
            // tooltip={isMobile ? undefined : tooltip}
          >
            <Link
              className={cn(
                "-webkit-touch-callout-none group/link relative flex h-10 w-full items-center gap-0! overflow-hidden transition-background-color duration-500 ease-(--ease-default) data-[state=open]:bg-sidebar-accent md:h-9",
                "focus-visible:box-shadow-none focus-visible:bg-sidebar-accent focus-visible:ring-0!",
                "focus-within:box-shadow-none focus-within:bg-sidebar-accent",
                "group-data-[cm-selected=true]/item:bg-sidebar-accent group-data-[cm-selected=true]/item:text-sidebar-accent-foreground",
                "",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
              params={{ id: thread.uuid }}
              to="/chat/{-$id}"
            >
              <LiveStateIndicatorIcon thread={thread} />
              <span className="mx-1 min-w-0 flex-1">
                <TruncatedText shimmer={isLoading} text={thread.title} />
              </span>
              {/* {endIcon && <span className="shrink-0">{endIcon}</span>} */}

              {!isMobile && (
                <>
                  <div
                    className={cn(
                      "pointer-events-auto absolute top-0 right-0 bottom-0 z-30 flex translate-x-full items-center justify-end gap-1 opacity-0 transition-[size;opacity] duration-(--duration-fast) ease-(--ease-default) group-hover/link:translate-x-0 group-hover/link:bg-sidebar-accent group-hover/link:opacity-100"
                    )}
                  >
                    <div className="pointer-events-none absolute top-0 right-full bottom-0 h-full w-8 bg-linear-to-l from-sidebar-accent to-transparent" />
                    <SidebarChatLinkQuickActions actions={quickActions} />
                  </div>
                  <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-30 flex items-center justify-end gap-1 p-1 opacity-0 transition-opacity duration-(--duration-fast) ease-(--ease-default) focus-within:pointer-events-auto focus-within:opacity-100">
                    <GlobalContextMenuButton
                      aria-label="Thread options"
                      className={cn(
                        "pointer-events-none h-7 w-7 shrink-0 rounded-md bg-sidebar-accent p-1.5 text-foreground opacity-0 backdrop-blur-sm hover:bg-sidebar-ring/50 hover:text-accent-foreground focus:outline-none focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                      )}
                    >
                      <MoreVerticalIcon className="size-4" />
                      <span className="sr-only">Thread options</span>
                    </GlobalContextMenuButton>
                  </div>
                </>
              )}
            </Link>
          </SidebarMenuButton>
        </Activity>
      </SidebarMenuItem>
    </GlobalContextMenuItem>
  );
}

export const SidebarChatLink = React.memo(
  _SidebarChatLink,
  (prev, next) =>
    prev.thread.uuid === next.thread.uuid &&
    prev.isActive === next.isActive &&
    prev.className === next.className &&
    prev.thread.liveStatus === next.thread.liveStatus &&
    prev.thread.title === next.thread.title &&
    prev.isMobile === next.isMobile &&
    prev.prerender === next.prerender
);

SidebarChatLink.displayName = "SidebarChatLink";
