import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { EditIcon, PinIcon, ShareIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import {
  ActionMenu,
  ActionMenuContent,
  type ActionMenuItem,
  ActionMenuTrigger,
} from "@/components/ui-custom/action-menu";
import { cn } from "@/lib/utils";
import { Shimmer } from "../ai-elements/shimmer";
import { Pulse2Icon } from "../ui/icons/svg-spinners-pulse-2";
import { Skeleton } from "../ui/skeleton";

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
    return "unread";
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
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          animate={{ width: "auto", translateX: 0, opacity: 1 }}
          className={className}
          exit={{ width: 0, translateX: -10, opacity: 0 }}
          initial={{ width: 0, translateX: -10, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut", type: "spring" }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// export function SidebarThreadItem({
//   title,
//   active,
//   liveState,
//   readState,
//   className,
//   menu,
//   children,
//   onClick,
//   ...props
// }: SidebarThreadItemProps) {
//   const button = (
//     <SidebarMenuButton
//       className={cn("group/menu-button relative overflow-hidden", className)}
//       isActive={active}
//       onClick={onClick}
//       title={title} // Native tooltip as requested
//       {...props}
//     >
//       <LiveStateIndicator liveState={liveState} readState={readState} />

//       {title === undefined ? (
//         <span className="h-4 w-2/3 flex-1 animate-pulse truncate rounded bg-muted" />
//       ) : (
//         <span
//           className={cn(
//             "flex-1 truncate transition-all duration-300",
//             readState === "unread" && "font-medium" // Consistent weight, maybe medium for unread
//           )}
//         >
//           {title}
//         </span>
//       )}
//     </SidebarMenuButton>
//   );

//   const buttonWithTooltip = menu ? (
//     <ContextMenuTrigger asChild>{button}</ContextMenuTrigger>
//   ) : (
//     button
//   );

//   return (
//     <SidebarMenuItem className="group/thread-item relative overflow-hidden rounded-md">
//       {menu ? (
//         <ContextMenu>
//           {buttonWithTooltip}
//           {menu}
//         </ContextMenu>
//       ) : (
//         buttonWithTooltip
//       )}

//       {/* Quick Actions Container */}
//       {children && (
//         <div
//           className={cn(
//             "absolute top-0 right-0 bottom-0 flex items-center gap-1 pr-1 pl-2",
//             "translate-x-full transition-transform duration-200 ease-out group-hover/thread-item:translate-x-0",
//             // Background to cover text. Using sidebar background or accent if active.
//             active ? "bg-sidebar-accent" : "bg-sidebar"
//           )}
//         >
//           {/* Gradient Mask on the left */}
//           <div
//             className={cn(
//               "-translate-x-full pointer-events-none absolute top-0 bottom-0 left-0 w-4 bg-linear-to-l to-transparent",
//               active ? "from-sidebar-accent" : "from-sidebar"
//             )}
//           />

//           {children}
//         </div>
//       )}
//     </SidebarMenuItem>
//   );
// }

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
      title={label}
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
  srTitle,
  shimmer,
}: {
  text?: string;
  className?: string;
  skeletonWidth?: string;
  srTitle?: string;
  shimmer?: boolean;
}) {
  if (text === undefined) {
    return (
      <Skeleton
        aria-label={srTitle}
        className={cn("h-5", skeletonWidth, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "block max-w-full overflow-hidden truncate text-ellipsis whitespace-nowrap",
        className
      )}
      title={srTitle}
    >
      {shimmer ? <Shimmer>{text}</Shimmer> : text}
    </span>
  );
}

function SidebarChatLinkQuickActions({
  actions,
}: {
  actions: ActionMenuItem[];
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
          onClick={() => {
            action.onSelect?.();
          }}
          variant={action.variant === "destructive" ? "destructive" : "default"}
        />
      ))}
    </div>
  );
}

const debugLiveStatusesCycle: Doc<"threads">["liveStatus"][] = [
  "pending",
  "streaming",
  "completed",
  "error",
  "cancelled",
];

export function SidebarChatLink({
  thread,
  className,
  endIcon,
  contextMenuItems,
  longPressMs,
}: {
  thread: Doc<"threads">;
  className?: string;
  endIcon?: React.ReactNode;
  contextMenuItems?: ActionMenuItem[];
  longPressMs?: number;
}) {
  const [debugThread, setDebugThread] = useState<Doc<"threads">>(thread);
  const isLoading =
    debugThread.liveStatus === "pending" ||
    debugThread.liveStatus === "streaming";
  const tooltip = debugThread.title || "Loading title";
  const menuItems: ActionMenuItem[] = contextMenuItems ?? [
    {
      id: "pin-thread",
      icon: PinIcon,
      label: "Pin thread",
      onSelect: () => console.log("Pin thread"),
    },
    {
      id: "rename-thread",
      icon: EditIcon,
      label: "Rename thread",
      onSelect: () => console.log("Rename thread"),
    },
    {
      id: "share-thread",
      icon: ShareIcon,
      label: "Share thread",
      onSelect: () => console.log("Share thread"),
    },
    {
      id: "delete-thread",
      icon: XIcon,
      label: "Delete thread",
      onSelect: () => console.log("Delete thread"),
      variant: "destructive",
    },
  ];
  const quickActions: ActionMenuItem[] = [
    {
      id: "pin-thread",
      icon: PinIcon,
      label: "Pin thread",
      onSelect: () => console.log("Pin thread"),
    },
    {
      id: "delete-thread",
      icon: XIcon,
      label: "Delete thread",
      onSelect: () => console.log("Delete thread"),
      variant: "destructive",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setDebugThread((prev) => ({
        ...prev,
        liveStatus: debugLiveStatusesCycle[
          (debugLiveStatusesCycle.indexOf(prev.liveStatus) + 1) %
            debugLiveStatusesCycle.length
        ] as Doc<"threads">["liveStatus"],
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SidebarMenuItem className={cn("select-none", className)}>
      <ActionMenu items={menuItems}>
        <ActionMenuTrigger longPressMs={longPressMs}>
          <SidebarMenuButton asChild tooltip={tooltip}>
            <Link
              className="group/link relative flex h-10 w-full items-center gap-0! overflow-hidden md:h-9"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              params={{ id: thread.uuid }}
              style={{
                WebkitTouchCallout: "none",
              }}
              to="/chat/{-$id}"
            >
              <LiveStateIndicatorIcon thread={debugThread} />
              <span className="mx-1 min-w-0 flex-1">
                <TruncatedText
                  shimmer={isLoading}
                  srTitle={tooltip}
                  text={thread.title}
                />
              </span>
              {endIcon && <span className="shrink-0">{endIcon}</span>}

              <div className="pointer-events-auto absolute top-0 right-0 bottom-0 z-50 flex translate-x-full items-center justify-end gap-1 opacity-0 transition-[size;opacity] duration-(--duration-fast) ease-(--ease-default) group-hover/link:translate-x-0 group-hover/link:bg-sidebar-accent group-hover/link:opacity-100">
                <div className="pointer-events-none absolute top-0 right-full bottom-0 h-full w-8 bg-linear-to-l from-sidebar-accent to-transparent" />
                <SidebarChatLinkQuickActions actions={quickActions} />
              </div>
            </Link>
          </SidebarMenuButton>
        </ActionMenuTrigger>
        <ActionMenuContent />
      </ActionMenu>
    </SidebarMenuItem>
  );
}
