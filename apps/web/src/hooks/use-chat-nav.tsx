import { useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  useEffect(() => {
    console.log("DEBUG123: NAV chat nav id", id);
  }, [id]);

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

/**
 * Anything passed as an Outlet component will be re-rendered when the chat nav
 * changes.
 *
 * Perhaps there is a better way to handle this....
 */
export function ChatNavRerenderTrigger({
  Outlet,
}: {
  Outlet: React.ComponentType;
}) {
  const chatNav = useChatNav();
  const previousChatNavRef = useRef<typeof chatNav>(chatNav);

  const key = useMemo(() => {
    let res: string;
    // stable id when staying on the isNew page
    if (
      chatNav.isNew === true &&
      chatNav.isNew === previousChatNavRef.current.isNew
    ) {
      res = previousChatNavRef.current.id;
    } else {
      res = chatNav.id;
    }
    previousChatNavRef.current = { ...chatNav };
    return res;
  }, [chatNav]);

  useEffect(() => {
    console.log("DEBUG123: ChatNavRerenderer: key changed !", { key });
  }, [key]);

  return (
    <React.Fragment key={key}>
      <Outlet />
    </React.Fragment>
  );
}
