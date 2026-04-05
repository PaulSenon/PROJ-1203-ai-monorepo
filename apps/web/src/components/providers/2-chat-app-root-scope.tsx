import { ChatNavProvider } from "@/hooks/chat/use-chat-nav";
import { SidebarProvider } from "../ui/sidebar";

/**
 * This is where you want to manually register all your context providers for
 * the chat-app scope (never remount while on chat)
 *
 * //* role:
 * //* register here all your providers scoped to chat-app lifetime.
 *
 * //* You can modify this
 */
function ChatAppRootScopeExternalProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatNavProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </ChatNavProvider>
  );
}

/**
 * @description
 * This is the thing you want to wrap you full chat-app with.
 * Will provide all your external context providers defined in above ChatAppRootScopeExternalProviders
 *
 * //* role:
 * //* internal wrapper
 *
 * ! This is internal wrapper, do not modify
 */
export function ChatAppRootScope({ children }: { children: React.ReactNode }) {
  return (
    <ChatAppRootScopeExternalProviders>
      {children}
    </ChatAppRootScopeExternalProviders>
  );
}
