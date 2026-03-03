import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export function useMobileSidebarAutoclose() {
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);
}
