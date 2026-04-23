import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useEffect } from "react";
import {
  createActiveConversationMessageStore,
  type ActiveConversationMessageStore,
  type ActiveConversationWarmStore,
  readActiveConversationVisibleMessages,
} from "./active-conversation-message-store";
import {
  getLatestVisibleMessages,
  hasSameMessageReferenceList,
} from "./conversation-message-helpers";
import { createConversationReconciler } from "./engine/conversation-reconciler";
import { type ConversationStatus } from "./engine/conversation-types";
import { useActiveConversationSourceState } from "./use-active-conversation-sources";

type VisibleMessagesListener = (messages: MyUIMessage[]) => void;

/**
 * Pure message projection runtime.
 *
 * Owns only message-view math:
 * - feeds reconciler sources
 * - applies optimistic message patches
 * - exposes snapshot/store reads for message UI and non-reactive peeks
 */
export type ActiveConversationMessageRuntime = ReturnType<
  typeof createActiveConversationMessageRuntime
>;

export function createActiveConversationMessageRuntime() {
  const store = createActiveConversationMessageStore();
  const reconciler = createConversationReconciler({
    applyPatch: (patch) => {
      store.getState().applyViewPatch(patch);
    },
  });

  return {
    applyOptimisticPatch(messages: MyUIMessage[] | MyUIMessage) {
      return reconciler.applyOptimisticPatch(messages);
    },
    destroy() {
      reconciler.destroy();
    },
    getMessageSnapshot(messageId: string) {
      return store.getState().recordsById[messageId];
    },
    getStore(): ActiveConversationMessageStore {
      return store;
    },
    getVisibleMessages() {
      return readActiveConversationVisibleMessages(store.getState());
    },
    replaceCacheMessages(messages: MyUIMessage[]) {
      reconciler.replaceColdSource("cache", messages);
    },
    replaceHttpMessage(message: MyUIMessage | null) {
      reconciler.replaceHotSource("http", message);
    },
    replacePersistedMessages(messages: MyUIMessage[]) {
      reconciler.replaceColdSource("persisted", messages);
    },
    replaceResumedMessage(message: MyUIMessage | null) {
      reconciler.replaceHotSource("resumed", message);
    },
    replaceStatus(status: ConversationStatus) {
      reconciler.replaceStatus(status);
    },
    revertOptimisticPatch(patchId: string) {
      reconciler.revertOptimisticPatch(patchId);
    },
    subscribeLatestVisibleMessages(listener: VisibleMessagesListener) {
      let lastVisibleMessages: MyUIMessage[] = [];

      return store.subscribe((state) => {
        const nextVisibleMessages = getLatestVisibleMessages(
          state.orderedIds,
          state.recordsById
        );
        if (
          hasSameMessageReferenceList(lastVisibleMessages, nextVisibleMessages)
        ) {
          return;
        }
        lastVisibleMessages = nextVisibleMessages;
        listener(nextVisibleMessages);
      });
    },
  };
}

/**
 * React-only adapter between reactive source hooks and the pure message runtime.
 *
 * It publishes message-source changes into the runtime and mirrors non-message
 * list controls back into the warm conversation store.
 */
export function ActiveConversationMessageRuntimeBridge({
  conversationStore,
  isSkip,
  resumeStreamEnabled,
  runtime,
  threadUuid,
}: {
  conversationStore: ActiveConversationWarmStore;
  isSkip: boolean;
  resumeStreamEnabled: boolean;
  runtime: ActiveConversationMessageRuntime;
  threadUuid: string | "skip";
}) {
  const sourceState = useActiveConversationSourceState({
    threadUuid,
    resumeStreamEnabled,
  });

  useEffect(() => {
    runtime.replaceCacheMessages(sourceState.cacheMessages);
  }, [runtime, sourceState.cacheMessages]);

  useEffect(() => {
    runtime.replacePersistedMessages(sourceState.persistedMessages);
  }, [runtime, sourceState.persistedMessages]);

  useEffect(() => {
    runtime.replaceResumedMessage(sourceState.resumedMessage);
  }, [runtime, sourceState.resumedMessage]);

  useEffect(() => {
    runtime.replaceHttpMessage(sourceState.httpMessage);
  }, [runtime, sourceState.httpMessage]);

  useEffect(() => {
    runtime.replaceStatus(sourceState.status);
    conversationStore.getState().replaceSourceStatus(sourceState.status);
  }, [conversationStore, runtime, sourceState.status]);

  useEffect(() => {
    conversationStore.getState().patchView({
      isLoadingOlder: sourceState.isLoadingOlder,
      loadOlder: sourceState.loadOlder,
      olderHistoryStatus: sourceState.olderHistoryStatus,
    });
  }, [
    conversationStore,
    sourceState.isLoadingOlder,
    sourceState.loadOlder,
    sourceState.olderHistoryStatus,
  ]);

  useEffect(() => {
    if (isSkip) return;

    return runtime.subscribeLatestVisibleMessages((messages) => {
      if (messages.length === 0) return;
      void sourceState.cacheSet(messages);
    });
  }, [runtime, isSkip, sourceState.cacheSet]);

  return null;
}
