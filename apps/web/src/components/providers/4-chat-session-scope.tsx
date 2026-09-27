import React, { createContext, useContext, useMemo } from "react";
import { AiSdkChatProvider } from "@/hooks/chat/use-ai-sdk-chat";
import { ActiveThreadProvider } from "@/hooks/use-chat-active";
import { ChatDraftProvider } from "@/hooks/use-chat-draft";
import { ChatInputProvider } from "@/hooks/use-chat-input";
import { ModelSelectorProvider } from "@/hooks/use-user-preferences";

export interface ChatSessionScopeContext {
  sessionId: string;
  isNew: boolean;
}
const ChatSessionScopeContext = createContext<ChatSessionScopeContext | null>(
  null
);

export function useChatSessionScope() {
  const ctx = useContext(ChatSessionScopeContext);

  if (ctx === null) {
    throw new Error(
      "[useChatSessionScope()] must be used under [ChatSessionScopeContext] (provided by [ChatSessionScope])"
    );
  }

  return ctx;
}

/**
 * This is where you want to manually register all your context providers for
 * the chat session scope.
 *
 * //* role:
 * //* register here all your providers scoped to chat session lifetime.
 *
 * //* You can modify this
 */
function ChatSessionScopeExternalProviders({
  children,
  sessionId,
  // isNew,
}: {
  children: React.ReactNode;
} & ChatSessionScopeContext) {
  return (
    <ChatDraftProvider>
      <ModelSelectorProvider>
        <ChatInputProvider>
          <AiSdkChatProvider sessionId={sessionId}>
            <ActiveThreadProvider>{children}</ActiveThreadProvider>
          </AiSdkChatProvider>
        </ChatInputProvider>
      </ModelSelectorProvider>
    </ChatDraftProvider>
  );
}

/**
 * @description
 * This is the piece bringing together:
 * - the chat session context (so anything bellow can resolve context via useChatSessionScope)
 * - all your external chat session context providers (that can then consume session context)
 *
 * //* role:
 * //* provide session context + all your external chat-session-scoped contexts
 *
 * ! This is internal wrapper, do not modify
 */
function ChatSessionScopeContextProvider({
  sessionId,
  isNew,
  children,
}: {
  children: React.ReactNode;
} & ChatSessionScopeContext) {
  const chatSessionContextValue = useMemo(
    () => ({
      sessionId,
      isNew,
    }),
    [sessionId, isNew]
  );

  return (
    <ChatSessionScopeContext.Provider value={chatSessionContextValue}>
      <ChatSessionScopeExternalProviders isNew={isNew} sessionId={sessionId}>
        {children}
      </ChatSessionScopeExternalProviders>
    </ChatSessionScopeContext.Provider>
  );
}

/**
 * @description
 * This is the ChatSessionScopeExternalProviders wrapper.
 * It is stable (skip rerender on same sessionId)
 * It provides all external chat session scoped providers
 * The full subtree is keyed by sessionId (so full remount when sessionId changes)
 * (this ensure all providers are reset on scope change)
 *
 * //* role:
 * //* internal keyed wrapper (memo + key reset)
 *
 * ! This is internal wrapper, do not modify
 */
export const ChatSessionScope = React.memo(function _ChatSessionScope({
  sessionId,
  isNew,
  children,
}: {
  children: React.ReactNode;
} & ChatSessionScopeContext) {
  return (
    <ChatSessionScopeContextProvider
      isNew={isNew}
      key={sessionId}
      sessionId={sessionId}
    >
      {children}
    </ChatSessionScopeContextProvider>
  );
});
