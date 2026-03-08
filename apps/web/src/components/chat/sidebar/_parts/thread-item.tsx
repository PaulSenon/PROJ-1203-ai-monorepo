import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { MoreVerticalIcon } from "lucide-react";
import {
  type ButtonHTMLAttributes,
  type ElementType,
  memo,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
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
import {
  SidebarItem,
  type SidebarItemRootProps,
} from "@/components/ui-custom/sidebar/sidebar-item";
import { Tooltip } from "@/components/ui-custom/tooltip";
import { useChatNav } from "@/hooks/use-chat-nav";
import { cn } from "@/lib/utils";
import {
  type LiveStateIndicatorVariant,
  useThreadItemState,
} from "../_hooks/use-thread-item-state";
import {
  getThreadMenuActions,
  getThreadQuickActions,
  type ThreadItemAction,
  type ThreadItemActionHandlers,
} from "./thread-item-actions";

type ThreadDoc = Doc<"threads">;

function LiveStateIndicatorIcon({
  className,
  variant,
}: {
  className?: string;
  variant: LiveStateIndicatorVariant | undefined;
}) {
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
        {variant === "pending" ? (
          <Pulse2Icon
            className="-top-1/2 -left-1/2 absolute origin-center animate-in text-muted-foreground/80"
            size={16}
          />
        ) : null}
      </div>
    </div>
  );
}

function ThreadTitle({
  isLoading,
  text,
}: {
  isLoading: boolean;
  text?: string;
}) {
  if (text === undefined) {
    return <span className="h-5 w-3/4 animate-pulse rounded bg-muted" />;
  }

  return (
    <SidebarItem.Title>
      {isLoading ? <Shimmer>{text}</Shimmer> : text}
    </SidebarItem.Title>
  );
}

function ThreadActionButton({
  icon: Icon,
  label,
  onClick,
  className,
  variant = "default",
  isMobile,
}: {
  icon: ElementType;
  label: string;
  onClick?: (event: ReactMouseEvent) => void;
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
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClick?.(event);
        }}
        size="icon"
        tabIndex={-1}
        variant="default"
      >
        <Icon className="size-4" />
        <span className="sr-only">{label}</span>
      </Button>
    </Tooltip>
  );
}

function ThreadQuickActions({
  actions,
  className,
  isMobile,
}: {
  actions: ThreadItemAction[];
  isMobile: boolean;
  className?: string;
}) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <SidebarItem.Actions className={className}>
      {actions.map((action) => (
        <ThreadActionButton
          className="shrink-0"
          icon={action.icon as ElementType}
          isMobile={isMobile}
          key={action.id}
          label={action.label}
          onClick={() => {
            action.callback();
          }}
          variant={action.variant === "destructive" ? "destructive" : "default"}
        />
      ))}
    </SidebarItem.Actions>
  );
}

function ThreadContextMenu({
  actions,
  children,
  className,
}: {
  actions: ThreadItemAction[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="group/cm">{children}</ContextMenuTrigger>
      <ContextMenuContent
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
        hideWhenDetached
        updatePositionStrategy="optimized"
      >
        {actions.map((item) => (
          <ContextMenuItem
            disabled={item.disabled}
            key={item.id}
            onSelect={(event) => {
              event.stopPropagation();
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

function A11YContextMenuTriggerButton(
  props: ButtonHTMLAttributes<HTMLButtonElement>
) {
  const open = (element: HTMLButtonElement) => {
    const rect = element.getBoundingClientRect();
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      button: 2,
      buttons: 2,
    });
    element.dispatchEvent(event);
  };

  return (
    <Button
      aria-haspopup="menu"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        open(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        open(event.currentTarget);
      }}
      variant="ghost"
      {...props}
    />
  );
}

type ThreadItemRootProps = {
  thread: ThreadDoc;
  isActive?: boolean;
  className?: string;
  as?: SidebarItemRootProps["as"];
  isMobile?: boolean;
  actionHandlers?: ThreadItemActionHandlers;
};

function ThreadItemRootImpl({
  thread,
  isActive = false,
  className,
  as = "li",
  isMobile = false,
  actionHandlers,
}: ThreadItemRootProps) {
  const chatNav = useChatNav();
  const { indicatorVariant, isLoading, tooltip } = useThreadItemState(thread);

  const quickActions = useMemo(
    () => getThreadQuickActions(thread, actionHandlers),
    [thread, actionHandlers]
  );
  const menuActions = useMemo(
    () => getThreadMenuActions(thread, actionHandlers),
    [thread, actionHandlers]
  );

  const handleLinkClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      event.preventDefault();
      chatNav.openExistingChat(thread.uuid);
    },
    [chatNav, thread.uuid]
  );

  return (
    <SidebarItem.Root as={as} className={className}>
      <ThreadContextMenu actions={menuActions}>
        <SidebarItem.Button asChild>
          <Link
            className={cn(
              "-webkit-touch-callout-none group/link relative flex h-10 w-full items-center gap-0! overflow-hidden transition-background-color duration-500 ease-(--ease-default) md:h-9",
              "focus-visible:box-shadow-none focus-visible:bg-sidebar-accent focus-visible:ring-0!",
              "focus-within:box-shadow-none focus-within:bg-sidebar-accent",
              "group-data-[state=open]/cm:bg-sidebar-accent",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            onClick={handleLinkClick}
            params={{ id: thread.uuid }}
            to="/chat/{-$id}"
          >
            <LiveStateIndicatorIcon variant={indicatorVariant} />
            <span className="mx-1 h-full min-w-0 flex-1 content-center">
              {isMobile ? null : (
                <Tooltip asChild isMobile={isMobile} tooltip={tooltip}>
                  <div className="absolute top-0 bottom-0 left-0 z-30 m-0 h-full w-[calc(100%-4rem)]" />
                </Tooltip>
              )}
              <ThreadTitle isLoading={isLoading} text={thread.title} />
            </span>
            {isMobile ? (
              <div className="relative z-30 mr-1 ml-1 flex shrink-0 items-center justify-center">
                <A11YContextMenuTriggerButton
                  aria-label="Thread options"
                  className={cn(
                    "sr-only h-7 w-7 shrink-0 rounded-md bg-transparent p-1.5 text-foreground hover:bg-sidebar-ring/50 hover:text-accent-foreground focus-visible:not-sr-only focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  )}
                >
                  <MoreVerticalIcon className="size-4" />
                  <span className="sr-only">Thread options</span>
                </A11YContextMenuTriggerButton>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "pointer-events-auto absolute top-0 right-0 bottom-0 z-30 flex translate-x-full items-center justify-end gap-1 opacity-0 transition-[size;opacity] duration-(--duration-fast) ease-(--ease-default) group-hover/link:translate-x-0 group-hover/link:bg-sidebar-accent group-hover/link:opacity-100"
                  )}
                >
                  <div className="pointer-events-none absolute top-0 right-full bottom-0 h-full w-8 bg-linear-to-l from-sidebar-accent to-transparent" />
                  <ThreadQuickActions
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
          </Link>
        </SidebarItem.Button>
      </ThreadContextMenu>
    </SidebarItem.Root>
  );
}

const ThreadItemRoot = memo(
  ThreadItemRootImpl,
  (previousProps, nextProps) =>
    previousProps.className === nextProps.className &&
    previousProps.as === nextProps.as &&
    previousProps.isActive === nextProps.isActive &&
    previousProps.isMobile === nextProps.isMobile &&
    previousProps.actionHandlers === nextProps.actionHandlers &&
    previousProps.thread.uuid === nextProps.thread.uuid &&
    previousProps.thread.title === nextProps.thread.title &&
    previousProps.thread.liveStatus === nextProps.thread.liveStatus
);

ThreadItemRoot.displayName = "ThreadItemRoot";

export const ThreadItem = {
  Root: ThreadItemRoot,
};

export { ThreadItemRoot };
