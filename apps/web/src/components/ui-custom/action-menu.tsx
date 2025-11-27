"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

type ActionMenuItem = {
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
  setOpen: (open: boolean) => void;
  items: ActionMenuItem[];
};

// ============================================================================
// Context
// ============================================================================

const ActionMenuContext = createContext<ActionMenuContextValue | null>(null);

// ============================================================================
// ActionMenu (Root)
// ============================================================================

type ActionMenuProps = {
  children: ReactNode;
  items: ActionMenuItem[];
  onOpenChange?: (open: boolean) => void;
};

function ActionMenu({ children, items, onOpenChange }: ActionMenuProps) {
  const [open, setOpenInternal] = useState(false);
  const isMobile = useIsMobile();
  const selectionLock = useSelectionLock();

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
    () => ({ open, setOpen, items }),
    [open, setOpen, items]
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
  longPressMs?: number;
  longPressMoveThreshold?: number;
  className?: string;
};

function ActionMenuTrigger({
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

  return (
    <ContextMenuTrigger
      asChild
      className={className}
      onPointerDown={handlePointerDown}
    >
      {children}
    </ContextMenuTrigger>
  );
}

// ============================================================================
// ActionMenuContent
// ============================================================================

type ActionMenuContentProps = Omit<
  ComponentProps<typeof ContextMenuContent>,
  "children"
>;

function ActionMenuContent({ className, ...props }: ActionMenuContentProps) {
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

// ============================================================================
// Exports
// ============================================================================

export { ActionMenu, ActionMenuTrigger, ActionMenuContent };
export type { ActionMenuItem, ActionMenuProps };
