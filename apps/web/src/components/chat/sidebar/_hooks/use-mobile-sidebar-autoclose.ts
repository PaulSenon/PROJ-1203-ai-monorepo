import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export function useMobileSidebarAutoclose(activeThreadId?: string) {
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [setOpenMobile, activeThreadId]);
}
