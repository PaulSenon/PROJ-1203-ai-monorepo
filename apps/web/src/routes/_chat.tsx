import { createFileRoute, Outlet } from "@tanstack/react-router";
import { memo, useEffect } from "react";
import { ChatSidebar } from "@/components/chat/sidebar/sidebar";
import { ScrollToBottomProvider } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";
import { AppReadyRouterBridge } from "@/hooks/use-app-ready-router-bridge";
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

const DeferredChatViewport = memo(function DeferredChatViewport() {
  return (
    <ChatProviders>
      <Outlet />
    </ChatProviders>
  );
});

function RouteComponent() {
  return (
    <ChatNavProvider>
      <AppReadyRouterBridge />
      <PreloadCache />
      <ChatSidebar>
        <DeferredChatViewport />
      </ChatSidebar>
    </ChatNavProvider>
  );
}
