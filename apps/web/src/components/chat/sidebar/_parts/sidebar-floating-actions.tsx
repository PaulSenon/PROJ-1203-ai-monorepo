import { PlusIcon, SearchIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { CollapsibleButtonGroup } from "@/components/ui-custom/button-group-collapsible";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";
import { Tooltip } from "@/components/ui-custom/tooltip";
import { cn } from "@/lib/utils";

export function SidebarFloatingActions({
  onNewChat,
  ...props
}: ComponentProps<typeof CollapsibleButtonGroup> & {
  onNewChat?: () => void;
}) {
  const { open, isMobile } = useSidebar();
  const isButtonGroupCollapsed = !isMobile && open;

  return (
    <CollapsibleButtonGroup
      {...props}
      className={cn(
        "pointer-events-auto z-50 flex origin-left items-center gap-0.5 overflow-hidden rounded-sm bg-foreground/5 p-1 backdrop-blur-xs",
        props.className
      )}
      collapsed={isButtonGroupCollapsed}
      defaultCollapsed={false}
    >
      <Tooltip asChild isMobile={isMobile} tooltip="Toggle Sidebar">
        <SidebarShell.Trigger />
      </Tooltip>

      <CollapsibleButtonGroup.CollapsibleContent>
        <Tooltip asChild isMobile={isMobile} tooltip="Search">
          <Button className="size-8" disabled variant="ghost">
            <SearchIcon className="size-4" />
            <span className="sr-only">Search (feature not available)</span>
          </Button>
        </Tooltip>

        <Tooltip asChild isMobile={isMobile} tooltip="New Chat">
          <Button className="size-8" onClick={onNewChat} variant="ghost">
            <PlusIcon className="size-4" />
            <span className="sr-only">New Chat</span>
          </Button>
        </Tooltip>
      </CollapsibleButtonGroup.CollapsibleContent>
    </CollapsibleButtonGroup>
  );
}
