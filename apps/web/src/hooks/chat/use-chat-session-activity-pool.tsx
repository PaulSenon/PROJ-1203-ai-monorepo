import { createContext, useContext, useMemo, useRef } from "react";
import type { ChatSessionScopeContext } from "@/components/providers/4-chat-session-scope";
import { useChatNav } from "./use-chat-nav";

export type ChatSessionActivityPoolContext = ChatSessionScopeContext[];

const ChatSessionActivityPoolContext =
  createContext<ChatSessionActivityPoolContext | null>(null);

export function useChatSessionActivityPool() {
  const ctx = useContext(ChatSessionActivityPoolContext);

  if (ctx === null) {
    throw new Error(
      "[useChatSessionActivityPool()] must be used under [ChatSessionActivityPoolContext] (provided by [ChatSessionActivityPoolContextProvider])"
    );
  }

  return ctx;
}

// TODO: move to utils ?
// TODO: test and document
function usePreviousRef<T>(
  state: T,
  isEqual: (prev: T, next: T) => boolean
): T | undefined {
  const lastSeenRef = useRef<T | undefined>(undefined);
  const lastChangedSnapshot = useRef<T | undefined>(undefined);

  // 1. init case
  if (lastSeenRef.current === undefined) {
    lastSeenRef.current = state;
    return;
  }

  // 2. detect changes between new and last seen
  if (!isEqual(lastSeenRef.current, state)) {
    lastChangedSnapshot.current = lastSeenRef.current;
    lastSeenRef.current = state;
    return lastChangedSnapshot.current;
  }

  // 3. when no change, we update last seen
  // but still return the previous last changes unmodified
  lastSeenRef.current = state;
  return lastChangedSnapshot.current;
}

function isUuidEqual(
  prev: ChatSessionScopeContext,
  next: ChatSessionScopeContext
) {
  return prev.sessionId === next.sessionId;
}

export function ChatSessionActivityPoolContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentThreadUuid, isNew, nextNewThreadUuid } = useChatNav();

  const currentSession = useMemo(
    () => ({
      isNew,
      sessionId: currentThreadUuid,
    }),
    [isNew, currentThreadUuid]
  ) satisfies ChatSessionScopeContext;

  const previousSession = usePreviousRef(currentSession, isUuidEqual);

  const nextNewSession = useMemo(
    () =>
      nextNewThreadUuid
        ? {
            isNew: true,
            sessionId: nextNewThreadUuid,
          }
        : undefined,
    [nextNewThreadUuid]
  ) satisfies ChatSessionScopeContext | undefined;

  const activityPoolContextValue = useMemo(
    () =>
      [currentSession, previousSession, nextNewSession].filter(
        (v): v is ChatSessionScopeContext => Boolean(v)
      ),
    [currentSession, previousSession, nextNewSession]
  ) satisfies ChatSessionActivityPoolContext;

  return (
    <ChatSessionActivityPoolContext.Provider value={activityPoolContextValue}>
      {children}
    </ChatSessionActivityPoolContext.Provider>
  );
}
