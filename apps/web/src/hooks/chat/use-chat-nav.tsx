import { useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createStableIdGenerator } from "@/lib/utils";
import { Route as ChatRoute } from "@/routes/_chat/chat.{-$id}";

interface ChatNavContextState {
  currentThreadUuid: string;
  isNew: boolean;
  nextNewThreadUuid?: string;
  isTransitioning: boolean;
}
interface ChatNavContextActions {
  persistNewChatIdToUrl: () => void;
  openNewChat: () => void;
  openExistingChat: (id: string) => void;
}

const ChatNavContextState = createContext<ChatNavContextState | null>(null);
const ChatNavContextActions = createContext<ChatNavContextActions | null>(null);

export function useChatNav() {
  const ctx = useContext(ChatNavContextState);

  if (ctx === null) {
    throw new Error(
      "[useChatNav()] must be used under [ChatNavContextState] (provided by [ChatNavProvider])"
    );
  }

  return ctx;
}

export function useChatNavActions() {
  const ctx = useContext(ChatNavContextActions);

  if (ctx === null) {
    throw new Error(
      "[useChatNavActions()] must be used under [ChatNavContextActions] (provided by [ChatNavProvider])"
    );
  }

  return ctx;
}

export function ChatNavProvider({ children }: { children: React.ReactNode }) {
  const [newIds] = useState(() => createStableIdGenerator(nanoid));
  const router = useRouter();
  const params = ChatRoute.useParams();
  const routeThreadUuid = params.id;
  const isNew = routeThreadUuid === undefined;
  const currentThreadUuid = routeThreadUuid ?? newIds.current;
  const [isTransitioning, startTransition] = useTransition();

  const openExistingChat = useCallback(
    (id: string) => {
      startTransition(() => {
        router.navigate({
          to: "/chat/{-$id}",
          params: { id },
        });
      });
    },
    [router]
  );

  const openNewChat = useCallback(() => {
    startTransition(() => {
      router.navigate({
        to: "/chat/{-$id}",
        params: { id: undefined },
      });
    });
  }, [router]);

  const isNewRef = useRef(isNew);
  isNewRef.current = isNew;
  const persistNewChatIdToUrl = useCallback(() => {
    if (!isNewRef.current) {
      console.error("Should not persist existing chat to url");
      return;
    }
    const id = newIds.consume();
    startTransition(() => {
      router.navigate({
        replace: true,
        to: "/chat/{-$id}",
        params: { id },
      });
    });
  }, [router, newIds]);

  const chatNavActionsValue = useMemo(
    () => ({
      openNewChat,
      persistNewChatIdToUrl,
      openExistingChat,
    }),
    [openNewChat, persistNewChatIdToUrl, openExistingChat]
  ) satisfies ChatNavContextActions;

  const chatNavStateValue = useMemo(
    () => ({
      currentThreadUuid,
      isNew,
      nextNewThreadUuid: isNew ? undefined : newIds.current,
      isTransitioning,
    }),
    [currentThreadUuid, isNew, newIds.current, isTransitioning]
  ) satisfies ChatNavContextState;

  return (
    <ChatNavContextActions.Provider value={chatNavActionsValue}>
      <ChatNavContextState.Provider value={chatNavStateValue}>
        {children}
      </ChatNavContextState.Provider>
    </ChatNavContextActions.Provider>
  );
}
