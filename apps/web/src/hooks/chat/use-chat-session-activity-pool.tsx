import type React from "react";
import { createContext, useContext, useMemo, useRef } from "react";
import type { ChatSessionScopeContext } from "@/components/providers/4-chat-session-scope";
import { useChatNav } from "./use-chat-nav";

export type ChatSessionActivityPoolContext = ChatSessionScopeContext[];

const ChatSessionActivityPoolContext =
  createContext<ChatSessionActivityPoolContext | null>(null);

export function useChatSessionActivityPool() {
  const pool = useContext(ChatSessionActivityPoolContext);

  if (pool === null) {
    throw new Error(
      "[useChatSessionActivityPool()] must be used under [ChatSessionActivityPoolContext] (provided by [ChatSessionActivityPoolContextProvider])"
    );
  }

  return pool;
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

function normalizePool(
  sessions: (ChatSessionScopeContext | undefined)[]
): ChatSessionScopeContext[] {
  const dedupedSessions = new Map<string, ChatSessionScopeContext>();

  for (const session of sessions) {
    if (!session) continue;

    const existingSession = dedupedSessions.get(session.sessionId);

    if (!existingSession) {
      dedupedSessions.set(session.sessionId, session);
      continue;
    }

    if (existingSession.isNew && !session.isNew) {
      dedupedSessions.set(session.sessionId, session);
    }
  }

  return [...dedupedSessions.values()];
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
    () => normalizePool([currentSession, previousSession, nextNewSession]),
    [currentSession, previousSession, nextNewSession]
  ) satisfies ChatSessionActivityPoolContext;

  return (
    <ChatSessionActivityPoolContext.Provider value={activityPoolContextValue}>
      {children}
    </ChatSessionActivityPoolContext.Provider>
  );
}
