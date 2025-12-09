import { SidebarFooter as BaseSidebarFooter } from "@/components/ui/sidebar";
import { BackdropBlurGlassEdge } from "../../bg-blur-glass-josh-comeau";

export function SidebarFooter({
  isOverflowing = false,
  className,
  children,
}: {
  isOverflowing?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <BaseSidebarFooter className={className}>
      <BackdropBlurGlassEdge
        position="bottom"
        thickness="1px"
        visible={isOverflowing}
      />
      {children}
    </BaseSidebarFooter>
  );
}
