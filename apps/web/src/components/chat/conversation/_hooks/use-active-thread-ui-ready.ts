import { useEffect } from "react";
import { useAppLoadStatusActions } from "@/hooks/use-app-load-status";

export function useActiveThreadUIReady(isPending: boolean) {
  const { setActiveThreadUIReady } = useAppLoadStatusActions();

  useEffect(() => {
    setActiveThreadUIReady(!isPending);
  }, [isPending, setActiveThreadUIReady]);
}
