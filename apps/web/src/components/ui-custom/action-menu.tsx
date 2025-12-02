"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelectionLock } from "@/hooks/utils/use-selection-lock";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ActionMenuItem = {
  id: string;
  label: string;
  onSelect?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  variant?: "default" | "destructive";
  disabled?: boolean;
};

type ActionMenuContextValue = {
  open: boolean;
  items: ActionMenuItem[];
  triggerRef: React.RefObject<HTMLElement | null>;
};

// ============================================================================
// Context
// ============================================================================

const ActionMenuContext = createContext<ActionMenuContextValue | null>(null);

// ============================================================================
// ActionMenu (Root)
// ============================================================================

export type ActionMenuProps = {
  children: ReactNode;
  items: ActionMenuItem[];
  onOpenChange?: (open: boolean) => void;
};

export function ActionMenu({ children, items, onOpenChange }: ActionMenuProps) {
  const [open, setOpenInternal] = useState(false);
  const isMobile = useIsMobile();
  const selectionLock = useSelectionLock();
  const triggerRef = useRef<HTMLElement>(null);

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      setOpenInternal(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!isMobile) return;

    if (open) {
      selectionLock.lock();
    } else {
      selectionLock.unlock();
    }
    return () => {
      selectionLock.unlock();
    };
  }, [open, selectionLock, isMobile]);

  const contextValue = useMemo<ActionMenuContextValue>(
    () => ({ open, items, triggerRef }),
    [open, items]
  );

  if (items.length === 0) {
    return <>{children}</>;
  }

  return (
    <ActionMenuContext.Provider value={contextValue}>
      <ContextMenu onOpenChange={setOpen}>{children}</ContextMenu>
    </ActionMenuContext.Provider>
  );
}

// ============================================================================
// ActionMenuTrigger
// ============================================================================

type ActionMenuTriggerProps = {
  children: React.ReactElement;
  longPressEnabled?: boolean;
  className?: string;
};

export function ActionMenuTrigger({
  children,
  longPressEnabled = true,
  className,
}: ActionMenuTriggerProps) {
  const context = useContext(ActionMenuContext);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      event.stopPropagation();
      if (!longPressEnabled) {
        event.preventDefault();
      }
    },
    [longPressEnabled]
  );

  // If no context (items.length === 0), just render children
  if (!context) {
    return children;
  }

  const { triggerRef } = context;

  return (
    <ContextMenuTrigger
      asChild
      className={className}
      onPointerDown={handlePointerDown}
      ref={triggerRef}
    >
      {children}
    </ContextMenuTrigger>
  );
}

// ============================================================================
// ActionMenuButton (Keyboard-accessible trigger)
// ============================================================================

type ActionMenuButtonProps = ComponentProps<"button"> & {
  className?: string;
};

export function ActionMenuButton({
  className,
  onClick,
  onKeyDown,
  ...props
}: ActionMenuButtonProps) {
  const context = useContext(ActionMenuContext);

  const triggerContextMenu = useCallback(() => {
    if (!context) return;
    const triggerElement = context.triggerRef.current;
    if (!triggerElement) return;

    const rect = triggerElement.getBoundingClientRect();
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: rect.right,
      clientY: rect.top + rect.height / 2,
    });
    triggerElement.dispatchEvent(event);
  }, [context]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      triggerContextMenu();
      onClick?.(e);
    },
    [triggerContextMenu, onClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        triggerContextMenu();
      }
      onKeyDown?.(e);
    },
    [triggerContextMenu, onKeyDown]
  );

  if (!context) {
    return null;
  }

  const isOpen = Boolean(context.open);

  return (
    <button
      aria-expanded={isOpen}
      aria-haspopup="menu"
      aria-label="Thread options"
      className={cn(className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type="button"
      {...props}
    />
  );
}

// ============================================================================
// ActionMenuContent
// ============================================================================

type ActionMenuContentProps = Omit<
  ComponentProps<typeof ContextMenuContent>,
  "children"
>;

export function ActionMenuContent({
  className,
  ...props
}: ActionMenuContentProps) {
  const context = useContext(ActionMenuContext);

  // No context means items was empty - don't render anything
  if (!context) {
    return null;
  }

  const { items } = context;

  return (
    <ContextMenuContent className={cn(className)} {...props}>
      {items.map((item) => (
        <ContextMenuItem
          disabled={item.disabled}
          key={item.id}
          onSelect={() => item.onSelect?.()}
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
  );
}
