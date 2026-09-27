import React from "react";
import { UserProfileButton } from "@/components/auth/user-avatar";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";
import { SpacerFrom } from "@/components/ui-custom/utils/spacer";

export function SidebarFooter({
  isOverflowing,
  className,
}: {
  isOverflowing: boolean;
  className?: string;
}) {
  return (
    <SidebarShell.Footer className={className} isOverflowing={isOverflowing}>
      <UserProfileButton className="z-50 px-4" />
    </SidebarShell.Footer>
  );
}

export const SidebarFooterSpacer = React.memo(
  ({ className }: { className?: string }) => (
    <SpacerFrom>
      <SidebarFooter className={className} isOverflowing={false} />
    </SpacerFrom>
  )
);
SidebarFooterSpacer.displayName = "SidebarFooterSpacer";
