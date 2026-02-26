import type { ComponentProps, CSSProperties } from "react";
import {
  SidebarContent as BaseSidebarContent,
  SidebarGroup as BaseSidebarGroup,
  SidebarGroupContent as BaseSidebarGroupContent,
  SidebarGroupLabel as BaseSidebarGroupLabel,
  SidebarMenu as BaseSidebarMenu,
  SidebarProvider as BaseSidebarProvider,
  SidebarTrigger as BaseSidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Sidebar as SidebarRootPrimitive } from "./primitives/sidebar";
import { SidebarFooter as SidebarFooterPrimitive } from "./primitives/sidebar-footer";
import { SidebarHeader as SidebarHeaderPrimitive } from "./primitives/sidebar-header";
import { SidebarInset as SidebarInsetPrimitive } from "./primitives/sidebar-inset";

const SIDEBAR_STYLE = {
  "--duration-base": "200ms",
} as CSSProperties;

export type SidebarProviderProps = ComponentProps<typeof BaseSidebarProvider>;

function SidebarProvider({ style, ...props }: SidebarProviderProps) {
  return (
    <BaseSidebarProvider style={{ ...SIDEBAR_STYLE, ...style }} {...props} />
  );
}

export type SidebarRootProps = ComponentProps<typeof SidebarRootPrimitive>;

function SidebarRoot({
  className,
  variant = "inset",
  ...props
}: SidebarRootProps) {
  return (
    <SidebarRootPrimitive
      className={cn("p-0 contain-strict", className)}
      variant={variant}
      {...props}
    />
  );
}

export type SidebarHeaderProps = ComponentProps<typeof SidebarHeaderPrimitive>;

function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
  return (
    <SidebarHeaderPrimitive
      className={cn("absolute top-0 z-50 w-full", className)}
      {...props}
    />
  );
}

export type SidebarContentProps = ComponentProps<typeof BaseSidebarContent>;

function SidebarContent({ className, ...props }: SidebarContentProps) {
  return (
    <BaseSidebarContent
      className={cn("gap-0 overscroll-contain p-0", className)}
      {...props}
    />
  );
}

export type SidebarGroupProps = ComponentProps<typeof BaseSidebarGroup>;

function SidebarGroup({ className, ...props }: SidebarGroupProps) {
  return <BaseSidebarGroup className={cn("px-2", className)} {...props} />;
}

export type SidebarGroupLabelProps = ComponentProps<
  typeof BaseSidebarGroupLabel
>;

function SidebarGroupLabel({ className, ...props }: SidebarGroupLabelProps) {
  return <BaseSidebarGroupLabel className={className} {...props} />;
}

export type SidebarGroupContentProps = ComponentProps<
  typeof BaseSidebarGroupContent
>;

function SidebarGroupContent({
  className,
  ...props
}: SidebarGroupContentProps) {
  return (
    <BaseSidebarGroupContent className={cn("px-2", className)} {...props} />
  );
}

export type SidebarMenuProps = ComponentProps<typeof BaseSidebarMenu>;

function SidebarMenu({ className, ...props }: SidebarMenuProps) {
  return (
    <BaseSidebarMenu
      className={cn("select-none gap-1.5", className)}
      {...props}
    />
  );
}

export type SidebarFooterProps = ComponentProps<typeof SidebarFooterPrimitive>;

function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return (
    <SidebarFooterPrimitive
      className={cn("absolute bottom-0 z-50 w-full", className)}
      {...props}
    />
  );
}

export type SidebarInsetProps = ComponentProps<typeof SidebarInsetPrimitive>;

function SidebarInset({ className, ...props }: SidebarInsetProps) {
  return <SidebarInsetPrimitive className={className} {...props} />;
}

export type SidebarTriggerProps = ComponentProps<typeof BaseSidebarTrigger>;

function SidebarTrigger({ className, ...props }: SidebarTriggerProps) {
  return <BaseSidebarTrigger className={cn("size-8", className)} {...props} />;
}

export const Sidebar = {
  Provider: SidebarProvider,
  Root: SidebarRoot,
  Header: SidebarHeader,
  Content: SidebarContent,
  Group: SidebarGroup,
  GroupLabel: SidebarGroupLabel,
  GroupContent: SidebarGroupContent,
  Menu: SidebarMenu,
  Footer: SidebarFooter,
  Inset: SidebarInset,
  Trigger: SidebarTrigger,
};
