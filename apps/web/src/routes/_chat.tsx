import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatSidebar } from "@/components/chat/sidebar/sidebar";
import { ChatAppRootScope } from "@/components/providers/2-chat-app-root-scope";
import { ChatWorkspaceScopeFromRouter } from "@/components/providers/3-chat-workspace-scope";
import { preloadUserPreferences } from "@/hooks/use-preload";

export const Route = createFileRoute("/_chat")({
  component: RouteComponent,
  // wrapInSuspense: true,
});

// function ChatProviders({ children }: { children: React.ReactNode }) {
//   return (
//     <UseChatProvider>
//       <ChatDraftProvider>
//         <ModelSelectorProvider>
//           <ChatInputProvider>
//             <ScrollToBottomProvider>{children}</ScrollToBottomProvider>
//           </ChatInputProvider>
//         </ModelSelectorProvider>
//       </ChatDraftProvider>
//     </UseChatProvider>
//   );
// }

function PreloadCache() {
  useEffect(() => {
    preloadUserPreferences();
  }, []);
  return null;
}

// const DeferredChatViewport = memo(function DeferredChatViewport() {
//   return (
//     <ChatProviders>
//       <Outlet />
//     </ChatProviders>
//   );
// });

function RouteComponent() {
  return (
    <ChatAppRootScope>
      {/* TODO: Workspace is never changing yet. Might move to workspace layout later. */}
      <ChatWorkspaceScopeFromRouter>
        {/* <AppReadyRouterBridge /> */}
        {/* <PreloadCache /> */}
        <ChatSidebar>
          <Outlet />
        </ChatSidebar>
      </ChatWorkspaceScopeFromRouter>
    </ChatAppRootScope>
  );
}
