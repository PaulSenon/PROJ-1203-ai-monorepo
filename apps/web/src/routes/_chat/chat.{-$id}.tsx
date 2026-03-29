import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/chat/chat";
import { ActiveThreadProvider } from "@/hooks/use-chat-active";

export const Route = createFileRoute("/_chat/chat/{-$id}")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ActiveThreadProvider>
      <Chat />
    </ActiveThreadProvider>
  );
}
