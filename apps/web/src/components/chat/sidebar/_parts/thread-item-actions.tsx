import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { EditIcon, PinIcon, ShareIcon, XIcon } from "lucide-react";
import type { ComponentType } from "react";

type ThreadDoc = Doc<"threads">;

export type ThreadItemAction = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  shortcut?: string;
  disabled?: boolean;
  variant?: "default" | "destructive";
  callback: () => void;
};

export type ThreadItemActionHandlers = {
  onPin?: (thread: ThreadDoc) => void;
  onRename?: (thread: ThreadDoc) => void;
  onShare?: (thread: ThreadDoc) => void;
  onDelete?: (thread: ThreadDoc) => void;
};

function toActionCallback(
  thread: ThreadDoc,
  callback?: (thread: ThreadDoc) => void
) {
  return () => {
    callback?.(thread);
  };
}

export function getThreadQuickActions(
  thread: ThreadDoc,
  handlers: ThreadItemActionHandlers = {}
): ThreadItemAction[] {
  return [
    {
      id: "pin-thread",
      icon: PinIcon,
      label: "Pin thread",
      callback: toActionCallback(thread, handlers.onPin),
    },
    {
      id: "delete-thread",
      icon: XIcon,
      label: "Delete thread",
      callback: toActionCallback(thread, handlers.onDelete),
      variant: "destructive",
    },
  ];
}

export function getThreadMenuActions(
  thread: ThreadDoc,
  handlers: ThreadItemActionHandlers = {}
): ThreadItemAction[] {
  return [
    {
      id: "pin-thread",
      icon: PinIcon,
      label: "Pin thread",
      callback: toActionCallback(thread, handlers.onPin),
    },
    {
      id: "rename-thread",
      icon: EditIcon,
      label: "Rename thread",
      callback: toActionCallback(thread, handlers.onRename),
    },
    {
      id: "share-thread",
      icon: ShareIcon,
      label: "Share thread",
      callback: toActionCallback(thread, handlers.onShare),
    },
    {
      id: "delete-thread",
      icon: XIcon,
      label: "Delete thread",
      callback: toActionCallback(thread, handlers.onDelete),
      variant: "destructive",
    },
  ];
}
