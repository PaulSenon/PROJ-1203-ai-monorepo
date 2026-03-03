import { PlusIcon } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";
import { SpacerFrom } from "@/components/ui-custom/utils/spacer";
import { cn } from "@/lib/utils";

export function SidebarHeader({
  isOverflowing,
  className,
  onNewChat,
}: {
  isOverflowing: boolean;
  className?: string;
  onNewChat?: () => void;
}) {
  return (
    <SidebarShell.Header className={className} isOverflowing={isOverflowing}>
      <h2 className="mt-0.5 h-full content-center text-center font-semibold text-lg">
        Isaaac.chat
      </h2>

      <div
        className={cn(
          "absolute top-3 top-safe-offset-2 right-3",
          "pointer-events-auto z-50 flex origin-left items-center gap-0.5 overflow-hidden rounded-sm p-1"
        )}
      >
        <Button
          className="size-8"
          onClick={onNewChat}
          size="icon"
          variant="ghost"
        >
          <PlusIcon className="size-4" />
          <span className="sr-only">New Chat</span>
        </Button>
      </div>
    </SidebarShell.Header>
  );
}

export const SidebarHeaderSpacer = React.memo(
  ({ className }: { className?: string }) => (
    <SpacerFrom>
      <SidebarHeader className={className} isOverflowing={false} />
    </SpacerFrom>
  )
);
SidebarHeaderSpacer.displayName = "SidebarHeaderSpacer";
