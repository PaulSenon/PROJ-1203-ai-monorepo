import type { ComponentProps } from "react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type SidebarItemRootProps = Omit<
  ComponentProps<typeof SidebarMenuItem>,
  "ref"
> & {
  as?: "li" | "div";
};

function SidebarItemRoot({
  as = "li",
  className,
  style,
  ...props
}: SidebarItemRootProps) {
  const mergedClassName = cn("min-h-10 select-none md:min-h-9", className);
  const mergedStyle = {
    contain: "layout style",
    ...style,
  };

  if (as === "div") {
    const divProps = props as unknown as ComponentProps<"div">;

    return (
      <div
        {...divProps}
        className={mergedClassName}
        role={divProps.role ?? "listitem"}
        style={mergedStyle}
      />
    );
  }

  return (
    <SidebarMenuItem
      {...props}
      className={mergedClassName}
      style={mergedStyle}
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
