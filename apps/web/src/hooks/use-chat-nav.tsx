import { useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { Route as ChatRoute } from "../routes/_chat/chat.{-$id}";

type ChatNavState = {
  isNew: boolean;
  id: string;
  persistNewChatIdToUrl: () => void;
  openNewChat: () => void;
  openExistingChat: (id: string) => void;
};

const ChatNavContext = createContext<ChatNavState | null>(null);

export function ChatNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // this will throw an error if used outside of /chat/{-$id} route:
  const params = ChatRoute.useParams();
  const isNew = params.id === undefined;
  const id = params.id ?? nanoid();

  const persistNewChatIdToUrl = useCallback(() => {
    if (!isNew) return;
    router.navigate({
      replace: true,
      to: "/chat/{-$id}",
      params: { id },
    });
  }, [isNew, id, router]);

  const openNewChat = useCallback(() => {
    router.navigate({
      to: "/chat/{-$id}",
      params: { id: undefined },
    });
  }, [router]);

  const openExistingChat = useCallback(
    (targetId: string) => {
      router.navigate({
        to: "/chat/{-$id}",
        params: { id: targetId },
      });
    },
    [router]
  );

  const value = useMemo(
    () =>
      ({
        isNew,
        id,
        persistNewChatIdToUrl,
        openNewChat,
        openExistingChat,
      }) satisfies ChatNavState,
    [isNew, id, persistNewChatIdToUrl, openNewChat, openExistingChat]
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
