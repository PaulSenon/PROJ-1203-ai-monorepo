import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Debug, DebugContextProvider } from "@/components/_debug/debug";

export const Route = createFileRoute("/_chat/chat/{-$id}")({
  component: RouteComponent,
});

function RouteComponent() {
  useEffect(() => {
    console.log("MOUNT chat page");
    return () => console.log("UNMOUNT chat page");
  }, []);

  return (
    <DebugContextProvider>
      <Debug />
    </DebugContextProvider>
  );
}
