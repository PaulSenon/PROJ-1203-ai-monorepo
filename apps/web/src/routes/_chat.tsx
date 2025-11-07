import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChatInputProvider } from "@/hooks/use-chat-input";

export const Route = createFileRoute("/_chat")({
  component: RouteComponent,

  wrapInSuspense: true,
});

function RouteComponent() {
  return (
    <>
      <ChatSidebar />
      <main className="group/sidebar-wrapper relative w-full min-w-0 flex-1">
        <SidebarTrigger className="fixed top-3 top-safe-offset-2 left-3 z-50 flex bg-background-transparent p-4" />
        <h1>Chat Layout</h1>
        <ChatInputProvider>
          <Outlet />
        </ChatInputProvider>
      </main>
    </>
  );
}
