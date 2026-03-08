import { createFileRoute } from "@tanstack/react-router";
import { memo } from "react";
import { Chat } from "@/components/chat/chat";
import { ActiveThreadProvider } from "@/hooks/use-chat-active";

export const Route = createFileRoute("/_chat/chat/{-$id}")({
  component: RouteComponent,
});

const DeferredChatRoute = memo(function DeferredChatRoute() {
  return (
    <ActiveThreadProvider>
      <Chat />
    </ActiveThreadProvider>
  );
});

function RouteComponent() {
  return <DeferredChatRoute />;
}
