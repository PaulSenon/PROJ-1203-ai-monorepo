import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import {
  EditIcon,
  MoreVerticalIcon,
  PinIcon,
  ShareIcon,
  XIcon,
} from "lucide-react";
import React, { Activity, useEffect, useMemo, useRef, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Pulse2Icon } from "@/components/ui/icons/svg-spinners-pulse-2";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Tooltip } from "../../tooltip";

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
  isMobile,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: "default" | "destructive";
  isMobile: boolean;
}) {
  return (
    <Tooltip asChild isMobile={isMobile} tooltip={label}>
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
    </Tooltip>
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

function MyTooltipContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof TooltipContent>) {
  return (
    <TooltipContent
      alignOffset={10}
      arrow={false}
      className={cn(
        "wrap-break-word max-h-[var(--radix-tooltip-content-available-height)]whitespace-normal max-w-(--radix-tooltip-content-available-width) overflow-auto",
        "pointer-events-none select-none bg-sidebar text-foreground text-xs md:bg-background",
        className
      )}
      collisionPadding={10}
      side="bottom"
      // sticky="always"
      {...props}
    >
      {children}
    </TooltipContent>
  );
}

export type ThreadAction = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  disabled?: boolean;
  variant?: "default" | "destructive";
  callback: () => void;
};

function SidebarChatLinkQuickActions({
  actions,
  className,
  isMobile,
}: {
  actions: ThreadAction[];
  isMobile: boolean;
  className?: string;
}) {
  if (actions.length === 0) {
    return null;
  }
  return (
    <div className={cn("flex items-center gap-1 p-1", className)}>
      {actions.map((action) => (
        <SidebarThreadActionButton
          className="shrink-0"
          icon={action.icon as React.ElementType}
          isMobile={isMobile}
          key={action.id}
          label={action.label}
          onClick={() => {
            action.callback();
          }}
          variant={action.variant === "destructive" ? "destructive" : "default"}
        />
      ))}
    </div>
  );
}

const SidebarChatLinkContextMenuContent = React.memo(
  ({
    actions,
    className,
    children,
  }: {
    actions: ThreadAction[];
    className?: string;
    children: React.ReactNode;
  }) => {
    return (
      <ContextMenu>
        <ContextMenuTrigger className="group/cm">{children}</ContextMenuTrigger>
        <ContextMenuContent
          // collision behavior
          avoidCollisions
          className={cn(
            "flex flex-col gap-1",
            "contain-content",
            "max-h-(--radix-context-menu-content-available-height) max-w-[min(20rem,var(--radix-context-menu-content-available-width))] overflow-y-auto overflow-x-hidden",
            "data-[state=open]:fade-in-0 data-[state=closed]:animate-none!",
            "duration-(--duration-fastest) ease-snappy",

            "bg-background/50 backdrop-blur-md",
            className
          )}
          collisionPadding={4}
          forceMount
          hideWhenDetached
          updatePositionStrategy="optimized"
        >
          {actions.map((item) => (
            <ContextMenuItem
              disabled={item.disabled}
              key={item.id}
              onSelect={() => {
                item.callback();
              }}
              variant={item.variant}
            >
              {item.icon ? <item.icon className="size-4" /> : null}
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut ? (
                <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut>
              ) : null}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);
SidebarChatLinkContextMenuContent.displayName =
  "SidebarChatLinkContextMenuContent";

export const SidebarThreadItem = React.memo(
  _SidebarThreadItem,
  (prev, next) =>
    prev.thread.uuid === next.thread.uuid &&
    prev.isActive === next.isActive &&
    prev.className === next.className &&
    prev.thread.liveStatus === next.thread.liveStatus &&
    prev.thread.title === next.thread.title &&
    prev.isMobile === next.isMobile &&
    prev.prerender === next.prerender
);

SidebarThreadItem.displayName = "SidebarThreadItem";

export function LazySidebarMenuItem({
  children,
  prerender = false,
  isMobile,
  className,
  ...props
}: {
  children: React.ReactNode;
  prerender?: boolean;
  isMobile: boolean;
} & React.ComponentProps<typeof SidebarMenuItem>) {
  const ref = useRef<HTMLLIElement>(null);
  const [isVisible, setIsVisible] = useState(prerender);

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
    <SidebarMenuItem
      className={cn("min-h-10 select-none md:min-h-9", className)}
      ref={ref}
      style={{
        contain: "layout style",
        contentVisibility: "auto",
        containIntrinsicBlockSize: `auto ${isMobile ? "40px" : "36px"}`,
      }}
      {...props}
    >
      <Activity mode={isVisible ? "visible" : "hidden"}>{children}</Activity>
    </SidebarMenuItem>
  );
}

function SidebarMenuItemLink({
  children,
  className,
  isActive = false,
  threadUuid,
}: {
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
  threadUuid: string;
}) {
  return (
    <Link
      className={cn(
        "-webkit-touch-callout-none group/link relative flex h-20 w-full items-center gap-0! overflow-hidden transition-background-color duration-500 ease-(--ease-default) md:h-9",
        "focus-visible:box-shadow-none focus-visible:bg-sidebar-accent focus-visible:ring-0!",
        "focus-within:box-shadow-none focus-within:bg-sidebar-accent",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        className
      )}
      params={{ id: threadUuid }}
      to="/chat/{-$id}"
    >
      {children}
    </Link>
  );
}

// TODO move in context-menu primitives
function A11YContextMenuTriggerButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const open = React.useCallback((el: HTMLButtonElement) => {
    const r = el.getBoundingClientRect();
    const ev = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
      button: 2,
      buttons: 2,
    });
    el.dispatchEvent(ev);
  }, []);

  return (
    <Button
      aria-haspopup="menu"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        open(e.currentTarget);
      }}
      variant="ghost"
      {...props}
    />
  );
}

export function _SidebarThreadItem({
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
  const isLoading =
    thread.liveStatus === "pending" || thread.liveStatus === "streaming";
  const tooltip = thread.title || "Loading title";

  const quickActions: ThreadAction[] = useMemo(
    () => [
      {
        id: "pin-thread",
        icon: PinIcon,
        label: "Pin thread",
        callback: () => console.log("Pin thread", thread.title),
      },
      {
        id: "delete-thread",
        icon: XIcon,
        label: "Delete thread",
        callback: () => console.log("Delete thread", thread.title),
        variant: "destructive",
      },
    ],
    [thread]
  );

  const menuItems: ThreadAction[] = useMemo(
    () => [
      {
        id: "pin-thread",
        icon: PinIcon,
        label: "Pin thread",
        callback: () => console.log("Pin thread"),
      },
      {
        id: "rename-thread",
        icon: EditIcon,
        label: "Rename thread",
        callback: () => console.log("Rename thread", thread.title),
      },
      {
        id: "share-thread",
        icon: ShareIcon,
        label: "Share thread",
        callback: () => console.log("Share thread", thread.title),
      },
      {
        id: "delete-thread",
        icon: XIcon,
        label: "Delete thread",
        callback: () => console.log("Delete thread", thread.title),
        variant: "destructive",
      },
    ],
    [thread]
  );

  return (
    <LazySidebarMenuItem
      className={className}
      isMobile={isMobile}
      prerender={prerender}
    >
      <SidebarChatLinkContextMenuContent actions={menuItems}>
        <SidebarMenuButton asChild>
          <SidebarMenuItemLink
            className={cn(
              "h-10 group-data-[state=open]/cm:bg-sidebar-accent md:h-9"
            )}
            isActive={isActive}
            threadUuid={thread.uuid}
          >
            <LiveStateIndicatorIcon thread={thread} />
            <span className="mx-1 h-full min-w-0 flex-1 content-center">
              {!isMobile && (
                <Tooltip asChild isMobile={isMobile} tooltip={tooltip}>
                  <div className="absolute top-0 bottom-0 left-0 z-30 m-0 h-full w-[calc(100%-4rem)]" />
                </Tooltip>
              )}

              <TruncatedText shimmer={isLoading} text={thread.title} />
            </span>
            {/* {endIcon && <span className="shrink-0">{endIcon}</span>} */}

            {!isMobile && (
              <>
                {/* <StopHoverShield className="pointer-events-none absolute top-0 right-0 bottom-0 z-30 m-0 h-full w-16 bg-red-400 p-0" /> */}
                <div
                  className={cn(
                    "pointer-events-auto absolute top-0 right-0 bottom-0 z-30 flex translate-x-full items-center justify-end gap-1 opacity-0 transition-[size;opacity] duration-(--duration-fast) ease-(--ease-default) group-hover/link:translate-x-0 group-hover/link:bg-sidebar-accent group-hover/link:opacity-100"
                  )}
                >
                  <div className="pointer-events-none absolute top-0 right-full bottom-0 h-full w-8 bg-linear-to-l from-sidebar-accent to-transparent" />
                  <SidebarChatLinkQuickActions
                    actions={quickActions}
                    isMobile={isMobile}
                  />
                </div>
                <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-30 flex items-center justify-end gap-1 p-1 opacity-0 transition-opacity duration-(--duration-fast) ease-(--ease-default) focus-within:pointer-events-auto focus-within:opacity-100">
                  <A11YContextMenuTriggerButton
                    aria-label="Thread options"
                    className={cn(
                      "pointer-events-none h-7 w-7 shrink-0 rounded-md bg-sidebar-accent p-1.5 text-foreground opacity-0 backdrop-blur-sm hover:bg-sidebar-ring/50 hover:text-accent-foreground focus:outline-none focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    )}
                  >
                    <MoreVerticalIcon className="size-4" />
                    <span className="sr-only">Thread options</span>
                  </A11YContextMenuTriggerButton>
                </div>
              </>
            )}
          </SidebarMenuItemLink>
        </SidebarMenuButton>
      </SidebarChatLinkContextMenuContent>
    </LazySidebarMenuItem>
  );
}
