import type { ReactNode } from "react";
import { Sidebar as SidebarShell } from "@/components/ui-custom/sidebar/sidebar-shell";

export function SidebarThreadList({ children }: { children: ReactNode }) {
  return (
    <SidebarShell.Group>
      <SidebarShell.GroupLabel>Previous Chats</SidebarShell.GroupLabel>
      <SidebarShell.GroupContent>
        <SidebarShell.Menu>{children}</SidebarShell.Menu>
      </SidebarShell.GroupContent>
    </SidebarShell.Group>
  );
}
