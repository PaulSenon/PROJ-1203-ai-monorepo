import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ScrollToBottomProvider } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";
import { ChatDraftProvider } from "@/hooks/use-chat-draft";
import { ChatInputProvider } from "@/hooks/use-chat-input";
import { ChatNavProvider } from "@/hooks/use-chat-nav";
import { UseChatProvider } from "@/hooks/use-messages-legacy";
import { preloadUserPreferences } from "@/hooks/use-preload";
import { ModelSelectorProvider } from "@/hooks/use-user-preferences";

export const Route = createFileRoute("/_chat")({
  component: RouteComponent,
  // wrapInSuspense: true,
});

function ChatProviders({ children }: { children: React.ReactNode }) {
  return (
    <UseChatProvider>
      <ChatDraftProvider>
        <ModelSelectorProvider>
          <ChatInputProvider>
            <ScrollToBottomProvider>{children}</ScrollToBottomProvider>
          </ChatInputProvider>
        </ModelSelectorProvider>
      </ChatDraftProvider>
    </UseChatProvider>
  );
}

function PreloadCache() {
  useEffect(() => {
    preloadUserPreferences();
  }, []);
  return null;
}

function RouteComponent() {
  return (
    <ChatNavProvider>
      <PreloadCache />
      <ChatSidebar>
        <ChatProviders>
          <Outlet />
        </ChatProviders>
      </ChatSidebar>
      {/* <main
        className={cn("group/sidebar-wrapper relative w-full min-w-0 flex-1")}
      >
        <SidebarTrigger className="fixed top-3 top-safe-offset-2 left-3 z-50 flex bg-background-transparent p-4" />
        <h1>Chat Layout</h1>
      </main> */}
    </ChatNavProvider>
  );
}
