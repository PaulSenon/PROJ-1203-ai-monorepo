import { useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Route as ChatRoute } from "../routes/_chat/chat.{-$id}";

type ChatNavState = {
  isNew: boolean;
  id: string;
  setThreadIntent: (id: string | undefined) => void;
  persistNewChatIdToUrl: () => void;
  openNewChat: () => void;
  openExistingChat: (id: string) => void;
};

const ChatNavContext = createContext<ChatNavState | null>(null);

export function ChatNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // this will throw an error if used outside of /chat/{-$id} route:
  const params = ChatRoute.useParams();
  const routeThreadId = params.id;
  const routeThreadIntent = routeThreadId ?? "__new__";

  const newChatIdRef = useRef<string>(nanoid());
  const [threadIntent, setThreadIntentState] =
    useState<string>(routeThreadIntent);

  useEffect(() => {
    setThreadIntentState((current) =>
      current === routeThreadIntent ? current : routeThreadIntent
    );
  }, [routeThreadIntent]);

  const setThreadIntent = useCallback((id: string | undefined) => {
    const nextThreadIntent = id ?? "__new__";
    setThreadIntentState((current) =>
      current === nextThreadIntent ? current : nextThreadIntent
    );
  }, []);

  const isNew = threadIntent === "__new__";
  const id = isNew ? newChatIdRef.current : threadIntent;

  const persistNewChatIdToUrl = useCallback(() => {
    if (routeThreadId !== undefined) return;
    router.navigate({
      replace: true,
      to: "/chat/{-$id}",
      params: { id },
    });
  }, [routeThreadId, id, router]);

  const openNewChat = useCallback(() => {
    newChatIdRef.current = nanoid();
    setThreadIntent(undefined);
    router.navigate({
      to: "/chat/{-$id}",
      params: { id: undefined },
    });
  }, [setThreadIntent, router]);

  const openExistingChat = useCallback(
    (targetId: string) => {
      setThreadIntent(targetId);
      router.navigate({
        to: "/chat/{-$id}",
        params: { id: targetId },
      });
    },
    [setThreadIntent, router]
  );

  const value = useMemo(
    () =>
      ({
        isNew,
        id,
        setThreadIntent,
        persistNewChatIdToUrl,
        openNewChat,
        openExistingChat,
      }) satisfies ChatNavState,
    [
      isNew,
      id,
      setThreadIntent,
      persistNewChatIdToUrl,
      openNewChat,
      openExistingChat,
    ]
  );
  return (
    <ChatNavContext.Provider value={value}>{children}</ChatNavContext.Provider>
  );
}

/**
 * @throws {Error} if used outside of /chat/{-$id} route
 */
export function useChatNav() {
  const context = useContext(ChatNavContext);
  if (!context) {
    throw new Error("useChatNav must be used within ChatNavProvider");
  }
  return context;
}
