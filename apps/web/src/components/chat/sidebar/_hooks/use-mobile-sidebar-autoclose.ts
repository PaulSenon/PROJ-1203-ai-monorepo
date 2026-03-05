import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export function useMobileSidebarAutoclose(threadIdentity: string) {
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [threadIdentity, setOpenMobile]);
}
