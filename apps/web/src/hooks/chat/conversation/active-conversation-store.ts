import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  createContext,
  useContext,
} from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { MaybePromise } from "@/lib/utils";
import {
  EMPTY_CONVERSATION_STATUS,
  type ConversationStatus,
} from "./engine/conversation-types";

type NoopLoadOlder = (numItems: number) => void;

const NOOP_LOAD_OLDER: NoopLoadOlder = (_numItems) => undefined;

export type ActiveConversationStatus =
  | "new"
  | "pending"
  | "streaming"
  | "completed"
  | "error"
  | "cancelled";

export type SendMessageParams = {
  text: string;
  options?: {
    selectedModelId?: AllowedModelIds;
  };
};

export type RegenerateMessageOptions = {
  selectedModelId?: string;
};

/**
 * High-level workflow actions owned by the conversation controller/provider.
 *
 * They may command the message runtime, but they are not part of the hot message path.
 */
export type ActiveConversationActions = {
  sendMessage: (params: SendMessageParams) => MaybePromise<void>;
  cancel: () => MaybePromise<void>;
  regenerate: (
    messageId: string,
    options?: RegenerateMessageOptions
  ) => MaybePromise<void>;
};

/**
 * Public conversation state consumed by non-message UI.
 *
 * This is the warm store: metadata, controller-derived flags, and list controls.
 */
export type ActiveConversationState = {
  uuid: string;
  streamStatus: ActiveConversationStatus | undefined;
  isDataPending: boolean;
  isDataStale: boolean;
  isStreaming: boolean;
  messagesQueue: MyUIMessage[];
  isThreadSettled: boolean;
  pendingAutoScrollMessageId: string | undefined;
  isLoadingOlder: boolean;
  loadOlder: (numItems: number) => void;
  olderHistoryStatus: string;
};

type ActiveConversationStoreValue = {
  actions: ActiveConversationActions;
  sourceStatus: ConversationStatus;
  view: ActiveConversationState;
};

type ActiveConversationStoreActions = {
  patchView: (patch: Partial<ActiveConversationState>) => void;
  replaceActions: (actions: ActiveConversationActions) => void;
  replaceSourceStatus: (status: ConversationStatus) => void;
  replaceView: (view: ActiveConversationState) => void;
};

export type ActiveConversationStore = ReturnType<
  typeof createActiveConversationStore
>;

/**
 * Session-scoped warm store for conversation metadata and controller actions.
 *
 * Non-message UI reads this store. Message UI should read the message store instead.
 */
export function createActiveConversationStore(
  sessionId: string,
  initial?: Partial<ActiveConversationStoreValue>
) {
  return createStore<
    ActiveConversationStoreValue & ActiveConversationStoreActions
  >()((set, get) => ({
    actions: initial?.actions ?? createEmptyActiveConversationActions(),
    sourceStatus: initial?.sourceStatus ?? EMPTY_CONVERSATION_STATUS,
    view: initial?.view ?? createEmptyActiveConversationState(sessionId),
    patchView(patch) {
      const currentView = get().view;
      const nextView = {
        ...currentView,
        ...patch,
      } satisfies ActiveConversationState;
      if (areActiveConversationStatesEqual(currentView, nextView)) return;
      set({ view: nextView });
    },
    replaceActions(actions) {
      if (areActiveConversationActionsEqual(get().actions, actions)) return;
      set({ actions });
    },
    replaceSourceStatus(status) {
      if (areConversationStatusesEqual(get().sourceStatus, status)) return;
      set({ sourceStatus: status });
    },
    replaceView(view) {
      if (areActiveConversationStatesEqual(get().view, view)) return;
      set({ view });
    },
  }));
}

export const ActiveConversationStoreContext =
  createContext<ActiveConversationStore | null>(null);

/**
 * Internal access to the warm conversation store instance.
 */
export function useActiveConversationStoreContext() {
  const store = useContext(ActiveConversationStoreContext);
  if (!store) {
    throw new Error(
      "ActiveConversation store must be used within ActiveConversationProvider"
    );
  }
  return store;
}

/**
 * Reads non-message conversation state.
 */
export function useActiveConversationState() {
  const store = useContext(ActiveConversationStoreContext);
  if (!store) {
    throw new Error(
      "useActiveConversationState must be used within ActiveConversationProvider"
    );
  }
  return useStore(store, (state) => state.view);
}

/**
 * Reads high-level conversation actions.
 */
export function useActiveConversationActions() {
  const store = useContext(ActiveConversationStoreContext);
  if (!store) {
    throw new Error(
      "useActiveConversationActions must be used within ActiveConversationProvider"
    );
  }
  return useStore(store, (state) => state.actions);
}

function createEmptyActiveConversationActions(): ActiveConversationActions {
  return {
    cancel: async () => undefined,
    regenerate: async () => undefined,
    sendMessage: async () => undefined,
  };
}

function createEmptyActiveConversationState(
  sessionId: string
): ActiveConversationState {
  return {
    uuid: sessionId,
    streamStatus: undefined,
    isDataPending: false,
    isDataStale: false,
    isStreaming: false,
    messagesQueue: [],
    isThreadSettled: false,
    pendingAutoScrollMessageId: undefined,
    isLoadingOlder: false,
    loadOlder: NOOP_LOAD_OLDER,
    olderHistoryStatus: "Exhausted",
  };
}

function areActiveConversationActionsEqual(
  a: ActiveConversationActions,
  b: ActiveConversationActions
) {
  return (
    a.cancel === b.cancel &&
    a.regenerate === b.regenerate &&
    a.sendMessage === b.sendMessage
  );
}

function areActiveConversationStatesEqual(
  a: ActiveConversationState,
  b: ActiveConversationState
) {
  return (
    a.uuid === b.uuid &&
    a.streamStatus === b.streamStatus &&
    a.isDataPending === b.isDataPending &&
    a.isDataStale === b.isDataStale &&
    a.isStreaming === b.isStreaming &&
    a.messagesQueue === b.messagesQueue &&
    a.isThreadSettled === b.isThreadSettled &&
    a.pendingAutoScrollMessageId === b.pendingAutoScrollMessageId &&
    a.isLoadingOlder === b.isLoadingOlder &&
    a.loadOlder === b.loadOlder &&
    a.olderHistoryStatus === b.olderHistoryStatus
  );
}

function areConversationStatusesEqual(
  a: ConversationStatus,
  b: ConversationStatus
) {
  return (
    a.isLoading === b.isLoading &&
    a.isPending === b.isPending &&
    a.isStale === b.isStale &&
    a.paginatedStatus === b.paginatedStatus &&
    a.streamingStatus === b.streamingStatus
  );
}
