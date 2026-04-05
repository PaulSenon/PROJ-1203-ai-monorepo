import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/chat/chat";

export const Route = createFileRoute("/_chat/chat/{-$id}")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Chat />;
}
