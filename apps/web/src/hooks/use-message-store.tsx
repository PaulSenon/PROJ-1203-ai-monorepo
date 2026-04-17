import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useValue } from "@legendapp/state/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  diffCanonicalMessages,
  normalizeCanonicalMessages,
} from "@/lib/messages/messages-core";
import {
  applyMessageStoreOps,
  createMessagesStore,
  fromStoredParts,
  type MessagesStore,
} from "@/lib/messages/messages-store";

const MessagesStoreContext = createContext<MessagesStore | null>(null);

export function MessagesStoreProvider({
  children,
  debugMode = false,
  messages,
}: {
  children: ReactNode;
  messages: MyUIMessage[];
  debugMode?: boolean;
}) {
  const canonical = useMemo(
    () => normalizeCanonicalMessages(messages),
    [messages]
  );
  const storeRef = useRef<MessagesStore | null>(null);
  const previousCanonicalRef = useRef(canonical);

  if (storeRef.current === null) {
    storeRef.current = createMessagesStore(canonical);
    previousCanonicalRef.current = canonical;
  }

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    const ops = diffCanonicalMessages(previousCanonicalRef.current, canonical, {
      debugMode,
    });
    if (ops.length === 0) return;

    applyMessageStoreOps(store, ops);
    previousCanonicalRef.current = canonical;
  }, [canonical, debugMode]);

  return (
    <MessagesStoreContext.Provider value={storeRef.current}>
      {children}
    </MessagesStoreContext.Provider>
  );
}

export function useMessageIds() {
  const store = useMessagesStore();
  return useValue(store.orderedIds$);
}

export function useMessageRole(messageId: string) {
  const store = useMessagesStore();
  return useValue(() => store.messagesById.get(messageId)?.role$.get());
}

export function useMessageMetadata(messageId: string) {
  const store = useMessagesStore();
  return useValue(() => store.messagesById.get(messageId)?.metadata$.get());
}

export function useMessageParts(messageId: string) {
  const store = useMessagesStore();
  return useValue(() => {
    const parts = store.messagesById.get(messageId)?.parts$.get();
    return parts ? fromStoredParts(parts) : undefined;
  });
}

export function useMessagesStoreApi() {
  const store = useMessagesStore();

  return useMemo(
    () => ({
      peekMessageRole(messageId: string) {
        return store.messagesById.get(messageId)?.role$.peek();
      },
      peekMessageParts(messageId: string) {
        const parts = store.messagesById.get(messageId)?.parts$.peek();
        return parts ? fromStoredParts(parts) : undefined;
      },
      peekMessageMetadata(messageId: string) {
        return store.messagesById.get(messageId)?.metadata$.peek();
      },
    }),
    [store]
  );
}

function useMessagesStore() {
  const store = useContext(MessagesStoreContext);
  if (!store) {
    throw new Error(
      "Message store hooks must be used within MessagesStoreProvider"
    );
  }

  return store;
}
