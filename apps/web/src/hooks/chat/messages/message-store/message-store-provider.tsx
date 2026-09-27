// MessageStoreProvider;
// useMessageStoreApi;
// useMessageStore;
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useStore } from "zustand";
import type { MessageModel } from "../message-core/message-layer";
import {
  type CreateMessageStoreConfig,
  createMessageStore,
  type MessageStoreApi,
  type MessageStoreState,
} from "./create-message-store";

const MessageStoreContext = createContext<MessageStoreApi | null>(null);

export type MessageStoreProviderProps = {
  threadUuid: string;
  initialCacheSnapshot?: readonly MessageModel[];
  children: ReactNode;
};

export function MessageStoreProvider({
  threadUuid,
  initialCacheSnapshot,
  children,
}: MessageStoreProviderProps) {
  const store = useMemo(
    () =>
      createMessageStore({
        threadUuid,
        initialCacheSnapshot,
      } satisfies CreateMessageStoreConfig),
    [threadUuid, initialCacheSnapshot]
  );

  useEffect(
    () => () => {
      store.disposeMessageStore?.();
    },
    [store]
  );

  return (
    <MessageStoreContext.Provider value={store}>
      {children}
    </MessageStoreContext.Provider>
  );
}

export function useMessageStoreApi(): MessageStoreApi {
  const store = useContext(MessageStoreContext);

  if (!store) {
    throw new Error(
      "useMessageStoreApi must be used within MessageStoreProvider"
    );
  }

  return store;
}

export function useMessageStore<T>(
  selector: (state: MessageStoreState) => T
): T {
  return useStore(useMessageStoreApi(), selector);
}
