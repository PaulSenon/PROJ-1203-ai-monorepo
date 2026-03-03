import type { ComponentProps } from "react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type SidebarItemRootProps = ComponentProps<typeof SidebarMenuItem> & {
  isMobile?: boolean;
};

function SidebarItemRoot({
  className,
  style,
  isMobile: _isMobile = false,
  ...props
}: SidebarItemRootProps) {
  return (
    <SidebarMenuItem
      className={cn("min-h-10 select-none md:min-h-9", className)}
      style={{
        contain: "layout style",
        ...style,
      }}
      {...props}
    />
  );
}

export type SidebarItemButtonProps = ComponentProps<typeof SidebarMenuButton>;

function SidebarItemButton({ className, ...props }: SidebarItemButtonProps) {
  return (
    <SidebarMenuButton className={cn("h-10 md:h-9", className)} {...props} />
  );
}

export type SidebarItemTitleProps = ComponentProps<"span">;

function SidebarItemTitle({ className, ...props }: SidebarItemTitleProps) {
  return (
    <span
      className={cn(
        "block max-w-full overflow-hidden truncate text-ellipsis whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
}

export type SidebarItemActionsProps = ComponentProps<"div">;

function SidebarItemActions({ className, ...props }: SidebarItemActionsProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1", className)} {...props} />
  );
}

export const SidebarItem = {
  Root: SidebarItemRoot,
  Button: SidebarItemButton,
  Title: SidebarItemTitle,
  Actions: SidebarItemActions,
};
