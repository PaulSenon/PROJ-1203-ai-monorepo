import { useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import React, {
  createContext,
  type ReactNode,
  startTransition,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Route as ChatRoute } from "../routes/_chat/chat.{-$id}";

type ChatThreadTarget = {
  kind: "new" | "existing";
  id: string;
};

type ChatNavState = {
  isNew: boolean;
  id: string;
};

type ChatNavShellState = ChatNavState & {
  activeThreadId: string | undefined;
  isSwitching: boolean;
};

type ChatNavActions = {
  setInstantExistingChatTarget: (id: string) => void;
  persistNewChatIdToUrl: () => void;
  openNewChat: () => void;
  openExistingChat: (id: string) => void;
};

const ChatNavInstantContext = createContext<ChatNavShellState | null>(null);
const ChatNavRenderContext = createContext<ChatNavState | null>(null);
const ChatNavActionsContext = createContext<ChatNavActions | null>(null);

function createNewChatTarget(id: string): ChatThreadTarget {
  return {
    kind: "new",
    id,
  };
}

function createExistingChatTarget(id: string): ChatThreadTarget {
  return {
    kind: "existing",
    id,
  };
}

function areTargetsEqual(a: ChatThreadTarget, b: ChatThreadTarget) {
  return a.kind === b.kind && a.id === b.id;
}

function toNavState(target: ChatThreadTarget): ChatNavState {
  return {
    id: target.id,
    isNew: target.kind === "new",
  };
}

export function ChatNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = ChatRoute.useParams();
  const routeThreadId = params.id;
  const [newThreadId, setNewThreadId] = useState(() => nanoid());

  const routeTarget = useMemo<ChatThreadTarget>(() => {
    if (routeThreadId === undefined) {
      return createNewChatTarget(newThreadId);
    }
    return createExistingChatTarget(routeThreadId);
  }, [newThreadId, routeThreadId]);

  const [instantTarget, setInstantTarget] = useState<ChatThreadTarget>(
    routeTarget
  );

  useEffect(() => {
    setInstantTarget((current) => {
      if (areTargetsEqual(current, routeTarget)) {
        return current;
      }
      return routeTarget;
    });
  }, [routeTarget]);

  const deferredTarget = useDeferredValue(instantTarget);
  const deferredTargetRef = useRef(deferredTarget);
  deferredTargetRef.current = deferredTarget;

  const setInstantExistingChatTarget = useCallback((id: string) => {
    setInstantTarget((current) => {
      const nextTarget = createExistingChatTarget(id);
      if (areTargetsEqual(current, nextTarget)) {
        return current;
      }
      return nextTarget;
    });
  }, []);

  const persistNewChatIdToUrl = useCallback(() => {
    if (deferredTargetRef.current.kind !== "new") return;
    startTransition(() => {
      router.navigate({
        replace: true,
        to: "/chat/{-$id}",
        params: { id: deferredTargetRef.current.id },
      });
    });
  }, [router]);

  const openNewChat = useCallback(() => {
    const nextId = nanoid();
    const nextTarget = createNewChatTarget(nextId);
    setNewThreadId(nextId);
    setInstantTarget(nextTarget);
    startTransition(() => {
      router.navigate({
        to: "/chat/{-$id}",
        params: { id: undefined },
      });
    });
  }, [router]);

  const openExistingChat = useCallback(
    (id: string) => {
      setInstantExistingChatTarget(id);
      startTransition(() => {
        router.navigate({
          to: "/chat/{-$id}",
          params: { id },
        });
      });
    },
    [router, setInstantExistingChatTarget]
  );

  const actions = useMemo(
    () =>
      ({
        setInstantExistingChatTarget,
        persistNewChatIdToUrl,
        openNewChat,
        openExistingChat,
      }) satisfies ChatNavActions,
    [
      setInstantExistingChatTarget,
      persistNewChatIdToUrl,
      openNewChat,
      openExistingChat,
    ]
  );

  const isSwitching = !areTargetsEqual(instantTarget, deferredTarget);

  const instantState = useMemo(
    () =>
      ({
        ...toNavState(instantTarget),
        activeThreadId:
          instantTarget.kind === "existing" ? instantTarget.id : undefined,
        isSwitching,
      }) satisfies ChatNavShellState,
    [instantTarget, isSwitching]
  );

  const renderState = useMemo(
    () => toNavState(deferredTarget) satisfies ChatNavState,
    [deferredTarget]
  );

  return (
    <ChatNavActionsContext.Provider value={actions}>
      <ChatNavInstantContext.Provider value={instantState}>
        <ChatNavRenderContext.Provider value={renderState}>
          {children}
        </ChatNavRenderContext.Provider>
      </ChatNavInstantContext.Provider>
    </ChatNavActionsContext.Provider>
  );
}

function useChatNavActions() {
  const context = useContext(ChatNavActionsContext);
  if (!context) {
    throw new Error("useChatNavActions must be used within ChatNavProvider");
  }
  return context;
}

function useChatNavShellState() {
  const context = useContext(ChatNavInstantContext);
  if (!context) {
    throw new Error("useChatNavShellState must be used within ChatNavProvider");
  }
  return context;
}

function useChatNavRenderState() {
  const context = useContext(ChatNavRenderContext);
  if (!context) {
    throw new Error("useChatNavRenderState must be used within ChatNavProvider");
  }
  return context;
}

/**
 * Urgent chat navigation state for shell feedback.
 */
export function useChatNav() {
  const state = useChatNavShellState();
  const actions = useChatNavActions();

  return useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [state, actions]
  );
}

/**
 * Deferred chat navigation state for heavy thread-bound rendering.
 */
export function useRenderChatNav() {
  const state = useChatNavRenderState();
  const actions = useChatNavActions();

  return useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [state, actions]
  );
}

export function useChatNavSwitching() {
  return useChatNavShellState().isSwitching;
}

/**
 * Anything passed as an Outlet component will be re-rendered when the selected
 * chat navigation identity changes.
 */
export function ChatNavRerenderTrigger({
  Outlet,
  mode = "instant",
}: {
  Outlet: React.ComponentType;
  mode?: "instant" | "deferred";
}) {
  if (mode === "deferred") {
    return <DeferredChatNavRerenderTrigger Outlet={Outlet} />;
  }

  return <InstantChatNavRerenderTrigger Outlet={Outlet} />;
}

function InstantChatNavRerenderTrigger({
  Outlet,
}: {
  Outlet: React.ComponentType;
}) {
  const chatNav = useChatNav();
  const previousChatNavRef = useRef<typeof chatNav>(chatNav);

  const key = useMemo(() => {
    let result: string;
    if (
      chatNav.isNew === true &&
      chatNav.isNew === previousChatNavRef.current.isNew
    ) {
      result = previousChatNavRef.current.id;
    } else {
      result = chatNav.id;
    }
    previousChatNavRef.current = { ...chatNav };
    return result;
  }, [chatNav]);

  return (
    <React.Fragment key={key}>
      <Outlet />
    </React.Fragment>
  );
}

function DeferredChatNavRerenderTrigger({
  Outlet,
}: {
  Outlet: React.ComponentType;
}) {
  const chatNav = useRenderChatNav();
  const previousChatNavRef = useRef<typeof chatNav>(chatNav);

  const key = useMemo(() => {
    let result: string;
    if (
      chatNav.isNew === true &&
      chatNav.isNew === previousChatNavRef.current.isNew
    ) {
      result = previousChatNavRef.current.id;
    } else {
      result = chatNav.id;
    }
    previousChatNavRef.current = { ...chatNav };
    return result;
  }, [chatNav]);

  return (
    <React.Fragment key={key}>
      <Outlet />
    </React.Fragment>
  );
}
