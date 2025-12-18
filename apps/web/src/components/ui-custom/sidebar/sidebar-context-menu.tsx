import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { EditIcon, PinIcon, ShareIcon, XIcon } from "lucide-react";
import React, {
  type ComponentProps,
  type MouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { createSelectionStore } from "../utils/granular-selection-store";

const ThreadSelectionStore = createSelectionStore<Doc<"threads">>(
  (thread) => thread.uuid
);

export function GlobalContextMenuItem({
  data,
  children,
  ...props
}: {
  data: Doc<"threads">;
  children: React.ReactNode;
} & ComponentProps<typeof ThreadSelectionStore.Item>) {
  const selected = ThreadSelectionStore.useIsSelected(data.uuid);

  return (
    <ThreadSelectionStore.Item
      data={data}
      // IMPORTANT: This is used with the GlobalContextMenuInner infer the selected from global handler
      data-cm-id={data.uuid}
      data-cm-selected={selected}
      data-slot="global-context-menu-item"
      {...props}
    >
      {children}
    </ThreadSelectionStore.Item>
  );
}

export function GlobalContextMenuButton(
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

// IMPORTANT: This a hack to prevent known radix issue
// when opening a new menu while another is open
// we need to rerender the menu otherwise it does not reset things properly
// but we need to do this only if not transitioning from open to closed
function useRadixContextMenuKeyHack(open: boolean) {
  const lastOpenRef = useRef<boolean>(false);
  const contentRerenderHackRef = useRef<number>(0);
  if (lastOpenRef.current === open) {
    contentRerenderHackRef.current++;
  }
  lastOpenRef.current = open;
  return contentRerenderHackRef.current;
}

export function GlobalContextMenuInner({
  children,
  items,
}: {
  children: React.ReactNode;
  items: ActionMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const keyHack = useRadixContextMenuKeyHack(open);

  const {
    setSelectedId,
    clear,
    get: getThread,
  } = ThreadSelectionStore.useActions();
  const [thread, setThread] = useState<Doc<"threads"> | null>(null);
  const intentIdRef = useRef<string | null>(null);

  const captureIntentIdFromTarget = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      // IMPORTANT: this data-cm-id is set from the GlobalContextMenuItem component
      const hit = target.closest("[data-cm-id]");
      const id = hit?.getAttribute("data-cm-id") ?? null;
      intentIdRef.current = id;
      return id;
    },
    []
  );

  // Phase 1: Capture intent from handler that work on every platform
  // Works on iOS (touch) + desktop. Does NOT commit selection.
  const onPointerDownCapture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      captureIntentIdFromTarget(e.target);
    },
    [captureIntentIdFromTarget]
  );

  // Desktop right-click path (keep it for mouse/trackpad reliability).
  const onContextMenuCapture = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const id = captureIntentIdFromTarget(e.target);
      if (!id) {
        e.preventDefault();
        e.stopPropagation();
      }
      // no commit here; commit happens in onOpenChange(true)
    },
    [captureIntentIdFromTarget]
  );

  // Phase 2: Commit selection and set thread
  const onOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        const id = intentIdRef.current;
        if (!id) return;

        const nextThread = getThread(id);

        flushSync(() => {
          setSelectedId(id);
          setOpen(true);
        });

        // IMPORTANT: not in flushSync
        setThread(nextThread);
        return;
      }

      // Important: do not setThread(null) here,
      // it causes a rerender and have bug side effect on mobile
      // closing the sidebar.
      intentIdRef.current = null;
      clear();
      setOpen(false);
    },
    [clear, getThread, setSelectedId]
  );

  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger
        onContextMenuCapture={onContextMenuCapture}
        onPointerDownCapture={onPointerDownCapture}
      >
        {children}
      </ContextMenuTrigger>
      <GlobalContextMenuContent items={items} key={keyHack} thread={thread} />
    </ContextMenu>
  );
}

export type ActionMenuItem = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  disabled?: boolean;
  variant?: "default" | "destructive";
  onSelect?: (thread: Doc<"threads">) => void;
};

export function _GlobalContextMenuContent({
  thread,
  items,
}: {
  thread: Doc<"threads"> | null;
  items: ActionMenuItem[];
}) {
  return (
    <ContextMenuContent
      // collision behavior
      avoidCollisions
      className={cn(
        "contain-content",
        "max-h-(--radix-context-menu-content-available-height) max-w-[min(20rem,var(--radix-context-menu-content-available-width))] overflow-y-auto overflow-x-hidden",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "duration-(--duration-fastest) ease-snappy",

        "bg-background/50 backdrop-blur-md"
      )}
      collisionPadding={4}
      forceMount
      hideWhenDetached
    >
      {items.map((item) => (
        <ContextMenuItem
          disabled={!thread || item.disabled}
          key={item.id}
          onSelect={() => {
            if (!thread) return;
            item.onSelect?.(thread);
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
  );
}
const GlobalContextMenuContent = React.memo(_GlobalContextMenuContent);

export function GlobalContextMenu({ children }: { children: React.ReactNode }) {
  const menuItems: ActionMenuItem[] = useMemo(
    () => [
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
        onSelect: (thread) => console.log("Rename thread", thread.title),
      },
      {
        id: "share-thread",
        icon: ShareIcon,
        label: "Share thread",
        onSelect: (thread) => console.log("Share thread", thread.title),
      },
      {
        id: "delete-thread",
        icon: XIcon,
        label: "Delete thread",
        onSelect: (thread) => console.log("Delete thread", thread.title),
        variant: "destructive",
      },
    ],
    []
  );

  return (
    <ThreadSelectionStore.Provider>
      <GlobalContextMenuInner items={menuItems}>
        {children}
      </GlobalContextMenuInner>
    </ThreadSelectionStore.Provider>
  );
}
