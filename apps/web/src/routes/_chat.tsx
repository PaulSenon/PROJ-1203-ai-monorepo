import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatSidebar } from "@/components/chat/sidebar/sidebar";
import { ChatAppRootScope } from "@/components/providers/2-chat-app-root-scope";
import { ChatWorkspaceScopeFromRouter } from "@/components/providers/3-chat-workspace-scope";
import { AppVisibilityNavBridge } from "@/hooks/chat/app-ready/app-ready-visibility-bridge";
import { preloadUserPreferences } from "@/hooks/use-preload";

export const Route = createFileRoute("/_chat")({
  component: RouteComponent,
});

function PreloadCache() {
  useEffect(() => {
    preloadUserPreferences();
  }, []);
  return null;
}

function RouteComponent() {
  return (
    <ChatAppRootScope>
      {/* TODO: Workspace is never changing yet. Might move to a workspace layout later. */}
      <ChatWorkspaceScopeFromRouter>
        <AppVisibilityNavBridge />
        <PreloadCache />
        <ChatSidebar>
          <Outlet />
        </ChatSidebar>
      </ChatWorkspaceScopeFromRouter>
    </ChatAppRootScope>
  );
}
