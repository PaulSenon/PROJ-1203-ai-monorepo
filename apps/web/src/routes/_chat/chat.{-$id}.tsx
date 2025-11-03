import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Chat } from "@/components/chat/chat";
import { ActiveThreadProvider } from "@/hooks/use-chat-active";

export const Route = createFileRoute("/_chat/chat/{-$id}")({
  component: RouteComponent,
});

function RouteComponent() {
  useEffect(() => {
    console.log("MOUNT chat page");
    return () => console.log("UNMOUNT chat page");
  }, []);

  return (
    <ActiveThreadProvider>
      <Chat />
    </ActiveThreadProvider>
  );
}
