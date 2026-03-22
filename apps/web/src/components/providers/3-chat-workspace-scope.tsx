import React, { createContext, useContext, useMemo } from "react";
import { ChatSessionActivityPoolContextProvider } from "@/hooks/chat/use-chat-session-activity-pool";
import { SidebarProvider } from "../ui/sidebar";
import { ScrollToBottomProvider } from "../ui-custom/chat/hooks/use-scroll-to-bottom";

interface ChatWorkspaceScopeContext {
  workspaceId: string;
}
const ChatWorkspaceScopeContext =
  createContext<ChatWorkspaceScopeContext | null>(null);

export function useChatWorkspaceScope() {
  const ctx = useContext(ChatWorkspaceScopeContext);

  if (ctx === null) {
    throw new Error(
      "[useChatWorkspaceScope()] must be used under [ChatWorkspaceScopeContext] (provided by [ChatWorkspaceScopeFromRouter] or manually via [ChatWorkspaceScope])"
    );
  }

  return ctx;
}

/**
 * This is where you want to manually register all your context providers for
 * the chat workspace scope.
 *
 * //* role:
 * //* register here all your providers scoped to chat workspace lifetime.
 *
 * //* You can modify this
 */
function ChatWorkspaceScopeExternalProviders({
  children,
  // TODO: when needed, alternative to useChatWorkspaceScope, for when you prefer using props.
  // workspaceId,
}: {
  children: React.ReactNode;
} & ChatWorkspaceScopeContext) {
  return (
    <SidebarProvider>
      <ChatSessionActivityPoolContextProvider>
        <ScrollToBottomProvider>{children}</ScrollToBottomProvider>
      </ChatSessionActivityPoolContextProvider>
    </SidebarProvider>
  );
}

/**
 * @description
 * This is the piece bringing together:
 * - the chat workspace context (so anything bellow can resolve context via useChatWorkspaceScope)
 * - all your external chat workspace context providers (that can then consume workspace context)
 *
 * //* role:
 * //* provide workspace context + all your external chat-workspace-scoped contexts
 *
 * ! This is internal wrapper, do not modify
 */
function ChatWorkspaceScopeContextProvider({
  workspaceId,
  children,
}: {
  children: React.ReactNode;
} & ChatWorkspaceScopeContext) {
  const chatWorkspaceContextValue = useMemo(
    () => ({
      workspaceId,
    }),
    [workspaceId]
  );

  return (
    <ChatWorkspaceScopeContext.Provider value={chatWorkspaceContextValue}>
      <ChatWorkspaceScopeExternalProviders workspaceId={workspaceId}>
        {children}
      </ChatWorkspaceScopeExternalProviders>
    </ChatWorkspaceScopeContext.Provider>
  );
}

/**
 * @description
 * This is the ChatWorkspaceScopeContextProvider wrapper.
 * It is stable (skip rerender on same workspaceId)
 * It provides all external chat workspace scoped providers
 * The full subtree is keyed by workspaceId (so full remount when workspaceId changes)
 * (this ensure all providers are reset on scope change)
 *
 * //* role:
 * //* internal keyed wrapper (memo + key reset)
 *
 * ! This is internal wrapper, do not modify
 */
const ChatWorkspaceScope = React.memo(function _ChatWorkspaceScope({
  workspaceId,
  children,
}: {
  children: React.ReactNode;
} & ChatWorkspaceScopeContext) {
  return (
    <ChatWorkspaceScopeContextProvider
      key={workspaceId}
      workspaceId={workspaceId}
    >
      {children}
    </ChatWorkspaceScopeContextProvider>
  );
});

/**
 * This is an self-contained version of ChatWorkspaceScope,
 * will auto-infer current workspaceId from router state.
 *
 * //* role:
 * //* external use
 *
 * ! This is internal wrapper, do not modify
 */
export function ChatWorkspaceScopeFromRouter({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: later plug to router or any parent context when implementing workspaces
  const workspaceId = "default";

  return (
    <ChatWorkspaceScope workspaceId={workspaceId}>
      {children}
    </ChatWorkspaceScope>
  );
}
