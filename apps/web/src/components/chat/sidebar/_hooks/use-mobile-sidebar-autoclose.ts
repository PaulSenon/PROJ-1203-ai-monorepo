import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export function useMobileSidebarAutoclose(activeThreadId: string | undefined) {
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [activeThreadId, setOpenMobile]);
}
