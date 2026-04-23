import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  createContext,
  useContext,
  useMemo,
} from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { type ActiveConversationStore, useActiveConversationStoreContext } from "./active-conversation-store";
import {
  EMPTY_CONVERSATION_STATUS,
  type ConversationViewState,
  type ViewPatch,
} from "./engine/conversation-types";

type ActiveConversationMessageStoreActions = {
  applyViewPatch: (patch: ViewPatch) => void;
};

export type ActiveConversationMessageStore = ReturnType<
  typeof createActiveConversationMessageStore
>;

/**
 * Hot message store consumed only by message UI and message-specific helpers.
 */
export function createActiveConversationMessageStore() {
  return createStore<
    ConversationViewState & ActiveConversationMessageStoreActions
  >()((set) => ({
    orderedIds: [],
    recordsById: {},
    status: EMPTY_CONVERSATION_STATUS,
    applyViewPatch(patch) {
      set((state) => {
        let nextState: ConversationViewState = state;

        if (
          patch.orderedIds !== undefined &&
          patch.orderedIds !== state.orderedIds
        ) {
          nextState = { ...nextState, orderedIds: patch.orderedIds };
        }

        if (patch.status !== undefined && patch.status !== state.status) {
          nextState = { ...nextState, status: patch.status };
        }

        if (patch.recordUpdates) {
          let recordsById = nextState.recordsById;
          let didRecordsChange = false;

          for (const [messageId, update] of Object.entries(
            patch.recordUpdates
          )) {
            if (update.kind === "remove") {
              if (!(messageId in recordsById)) continue;
              if (!didRecordsChange) {
                recordsById = { ...recordsById };
                didRecordsChange = true;
              }
              delete recordsById[messageId];
              continue;
            }

            if (recordsById[messageId] === update.value) continue;
            if (!didRecordsChange) {
              recordsById = { ...recordsById };
              didRecordsChange = true;
            }
            recordsById[messageId] = update.value;
          }

          if (didRecordsChange) {
            nextState = { ...nextState, recordsById };
          }
        }

        return nextState;
      });
    },
  }));
}

export const ActiveConversationMessageStoreContext =
  createContext<ActiveConversationMessageStore | null>(null);

/**
 * Internal access to the hot message store instance.
 */
export function useActiveConversationMessageStoreContext() {
  const store = useContext(ActiveConversationMessageStoreContext);
  if (!store) {
    throw new Error(
      "ActiveConversation message store must be used within ActiveConversationProvider"
    );
  }
  return store;
}

/**
 * Reads message ordering plus list-level feed controls.
 */
export function useActiveConversationMessageIds() {
  const messagesStore = useActiveConversationMessageStoreContext();
  const conversationStore = useActiveConversationStoreContext();
  const messageIds = useStore(messagesStore, (state) => state.orderedIds);
  const isLoadingOlder = useStore(
    conversationStore,
    (state) => state.view.isLoadingOlder
  );
  const olderHistoryStatus = useStore(
    conversationStore,
    (state) => state.view.olderHistoryStatus
  );
  const loadOlder = useStore(conversationStore, (state) => state.view.loadOlder);

  const getMessageSnapshot = useMemo(
    () => (messageId: string) => messagesStore.getState().recordsById[messageId],
    [messagesStore]
  );

  return useMemo(
    () => ({
      messageIds,
      getMessageSnapshot,
      isLoadingOlder,
      olderHistoryStatus,
      loadOlder,
    }),
    [
      messageIds,
      getMessageSnapshot,
      isLoadingOlder,
      olderHistoryStatus,
      loadOlder,
    ]
  );
}

/**
 * Row-level selector into the hot message store.
 */
export function useActiveConversationMessage(messageId: string) {
  const store = useActiveConversationMessageStoreContext();
  return useStore(store, (state) => state.recordsById[messageId]);
}

export function readActiveConversationVisibleMessages(
  state: Pick<ConversationViewState, "orderedIds" | "recordsById">
) {
  return state.orderedIds
    .map((messageId) => state.recordsById[messageId])
    .filter((message): message is MyUIMessage => message !== undefined);
}

export type ActiveConversationWarmStore = ActiveConversationStore;
