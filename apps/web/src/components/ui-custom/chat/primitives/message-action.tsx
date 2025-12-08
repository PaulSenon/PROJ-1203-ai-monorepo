import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ChatMessageActionContextItem = {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  disabled?: boolean;
};

export type ChatMessageActionProps = ComponentProps<typeof Button> & {
  icon: ReactNode;
  tooltip: string;
  contextMenuItems?: ChatMessageActionContextItem[];
};

function ActionButtonBase({
  className,
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("size-8 p-0", className)}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  );
}

export function ChatMessageAction({
  icon,
  tooltip,
  contextMenuItems,
  className,
  ...props
}: ChatMessageActionProps) {
  const button = (
    <Tooltip>
      <TooltipTrigger asChild>
        <ActionButtonBase className={className} {...props}>
          <span className="flex items-center justify-center">{icon}</span>
          <span className="sr-only">{tooltip}</span>
        </ActionButtonBase>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );

  if (!contextMenuItems || contextMenuItems.length === 0) {
    return button;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{button}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {contextMenuItems.map((item) => (
          <ContextMenuItem
            disabled={item.disabled}
            key={item.label}
            onSelect={item.onSelect}
          >
            {item.icon && <span className="mr-2 inline-flex">{item.icon}</span>}
            {item.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
