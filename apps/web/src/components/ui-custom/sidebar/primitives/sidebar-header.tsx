import type React from "react";
import { SidebarHeader as BaseSidebarHeader } from "@/components/ui/sidebar";
import { BackdropBlurGlassEdge } from "../../bg-blur-glass-josh-comeau";

export function SidebarHeader({
  isOverflowing = false,
  className,
  children,
}: {
  isOverflowing?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <BaseSidebarHeader className={className}>
      <BackdropBlurGlassEdge
        position="top"
        thickness="1px"
        visible={isOverflowing}
      />
      <div className="z-10 mt-2 min-h-8">{children}</div>
    </BaseSidebarHeader>
  );
}
