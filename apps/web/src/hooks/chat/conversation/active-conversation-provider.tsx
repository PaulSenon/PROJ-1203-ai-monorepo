import { createOptimisticStepStartMessage } from "@ai-monorepo/ai/helpers";
import type { MyUIMessage, MyUIMessageMetadata } from "@ai-monorepo/ai/types/uiMessage";
import { nanoid } from "nanoid";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useChatSessionScope } from "@/components/providers/4-chat-session-scope";
import {
  useAiSdkChatActions,
  useAiSdkChatHandlers,
  useAiSdkChatState,
} from "@/hooks/chat/use-ai-sdk-chat";
import { useChatNavActions } from "@/hooks/chat/use-chat-nav";
import { useCvxMutationAuthV3 } from "@/hooks/queries/convex/utils/use-convex-mutation-0-auth";
import { useThread } from "@/hooks/queries/use-chat-active-queries";
import { useChatInputActions } from "@/hooks/use-chat-input";
import {
  getLiveStatusKind,
  useStreamOwnership,
} from "@/hooks/use-stream-ownership";
import { cvx } from "@/lib/convex/queries";
import { ActiveConversationMessageStoreContext } from "./active-conversation-message-store";
import {
  ActiveConversationMessageRuntimeBridge,
  createActiveConversationMessageRuntime,
  type ActiveConversationMessageRuntime,
} from "./active-conversation-message-runtime";
import {
  ActiveConversationStoreContext,
  createActiveConversationStore,
  type ActiveConversationActions,
  type ActiveConversationState,
} from "./active-conversation-store";
import { EMPTY_CONVERSATION_STATUS } from "./engine/conversation-types";

/**
 * High-level conversation controller.
 *
 * Owns:
 * - action orchestration
 * - thread metadata / derived state
 * - AI SDK command triggering
 * - Convex mutation flow
 * - nav/input side effects
 *
 * Delegates:
 * - message-source wiring to `ActiveConversationMessageRuntimeBridge`
 * - granular message projection/store writes to `ActiveConversationMessageRuntime`
 */
export function ActiveConversationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const inputActions = useChatInputActions();
  const chatNavAction = useChatNavActions();
  const scope = useChatSessionScope();
  const isSkip = scope.isNew;

  const {
    data: thread,
    isPending: isThreadQueryPending,
    isStale: isThreadQueryStale,
  } = useThread(isSkip ? "skip" : scope.sessionId);

  const { isLocalOwned, markOwned, clearOwnership } = useStreamOwnership({
    threadUuid: isSkip ? "skip" : scope.sessionId,
    liveStatus: thread?.liveStatus,
    isThreadQueryPending,
  });

  const liveStatusKind = getLiveStatusKind(thread?.liveStatus);
  const resumeStreamEnabled =
    !(isSkip || isThreadQueryPending || isLocalOwned) &&
    liveStatusKind === "ongoing";

  const conversationStoreRef = useRef<ReturnType<
    typeof createActiveConversationStore
  > | null>(null);
  const messageRuntimeRef = useRef<ActiveConversationMessageRuntime | null>(
    null
  );
  const pendingAutoScrollMessageIdRef = useRef<string | undefined>(undefined);
  const upsertPromiseRef = useRef<Promise<unknown>>(Promise.resolve());
  const messagesQueueRef = useRef<MyUIMessage[]>([]);

  if (messageRuntimeRef.current === null) {
    messageRuntimeRef.current = createActiveConversationMessageRuntime();
  }

  const messageRuntime = messageRuntimeRef.current;

  const {
    sendMessage: sdkSendMessage,
    regenerate: sdkRegenerate,
    setMessages: sdkSetMessages,
  } = useAiSdkChatActions();
  const { status: sdkStatus } = useAiSdkChatState();

  const upsertConversation = useCvxMutationAuthV3(
    ...cvx.mutationV3.threads.upsert.options()
  );

  useAiSdkChatHandlers({
    onError: async (error) => {
      console.error("sdkChatError", error);
      clearOwnership();

      await upsertPromiseRef.current.catch((e) => {
        console.error("Error in previous upsert", e);
      });
      await upsertConversation({
        threadUuid: scope.sessionId,
        patch: {
          liveStatus: "error",
        },
      }).catch((e) => {
        console.error(
          "Error attempting to update conversation liveStatus to error from client",
          e
        );
      });
    },
  });

  const sendMessageInternal = useCallback(
    async (uiMessage: MyUIMessage, nextMessageId: string) => {
      if (scope.isNew) chatNavAction.persistNewChatIdToUrl();

      const optimisticNextMessage =
        createOptimisticStepStartMessage(nextMessageId);

      inputActions.clear();
      upsertPromiseRef.current = upsertConversation({
        threadUuid: scope.sessionId,
        patch: {
          liveStatus: "pending",
          lastUsedModelId: uiMessage.metadata?.modelId,
        },
      });

      let patchId: string | undefined;

      try {
        patchId = messageRuntime.applyOptimisticPatch([
          uiMessage,
          optimisticNextMessage,
        ]);
        pendingAutoScrollMessageIdRef.current = optimisticNextMessage.id;
        sdkSetMessages([]);
        markOwned();
        await sdkSendMessage(uiMessage, {
          metadata: {
            nextMessageId,
          },
        });
      } catch (error) {
        clearOwnership();
        console.error("error while sending message", error);
      } finally {
        if (patchId) messageRuntime.revertOptimisticPatch(patchId);
        sdkSetMessages([]);
        await upsertPromiseRef.current.catch((error) => {
          console.error("error while upserting conversation", error);
        });
      }
    },
    [
      chatNavAction.persistNewChatIdToUrl,
      clearOwnership,
      inputActions.clear,
      markOwned,
      messageRuntime,
      scope.isNew,
      scope.sessionId,
      sdkSendMessage,
      sdkSetMessages,
      upsertConversation,
    ]
  );

  const sendMessage = useCallback<ActiveConversationActions["sendMessage"]>(
    (params) => {
      const messageId = nanoid();
      const nextMessageId = nanoid();

      return sendMessageInternal(
        {
          role: "user",
          parts: [{ type: "text", text: params.text }],
          id: messageId,
          metadata: {
            modelId: params.options?.selectedModelId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            liveStatus: "completed",
            lifecycleState: "active",
          },
        } satisfies MyUIMessage,
        nextMessageId
      );
    },
    [sendMessageInternal]
  );

  const cancel = useCallback<ActiveConversationActions["cancel"]>(async () => {
    console.log("TODO: cancel");
  }, []);

  const regenerate = useCallback<ActiveConversationActions["regenerate"]>(
    async (messageId, options) => {
      const upsertPromise = upsertConversation({
        threadUuid: scope.sessionId,
        patch: {
          liveStatus: "pending",
          lastUsedModelId: options?.selectedModelId,
        },
      });

      let patchId: string | undefined;

      try {
        const messages = messageRuntime.getVisibleMessages();
        let messageIndex = messages.findIndex((message) => message.id === messageId);
        while (messageIndex > 0 && messages[messageIndex]?.role === "assistant") {
          messageIndex--;
        }

        const firstUserMessageIndex = messageIndex;
        const message = messages[firstUserMessageIndex];
        const messagesToRemove = messages
          .slice(firstUserMessageIndex + 1)
          .map(
            (entry): MyUIMessage => ({
              ...entry,
              metadata: {
                ...(entry.metadata as MyUIMessageMetadata),
                lifecycleState: "deleted",
              },
            })
          );

        if (!message) {
          console.error(
            "Cannot regenerate: message user message not found before",
            {
              messageId,
              messages,
              messageIndex,
            }
          );
          return;
        }

        patchId = messageRuntime.applyOptimisticPatch(messagesToRemove);
        sdkSetMessages([message]);
        markOwned();
        await sdkRegenerate({
          messageId: message.id,
          metadata: {
            selectedModelId: options?.selectedModelId,
          },
        });
      } catch (error) {
        clearOwnership();
        console.error("error while regenerating message", error);
        await upsertPromise;
        await upsertConversation({
          threadUuid: scope.sessionId,
          patch: {
            liveStatus: "error",
          },
        });
      } finally {
        if (patchId) messageRuntime.revertOptimisticPatch(patchId);
        sdkSetMessages([]);
        await upsertPromise.catch((error) => {
          console.error("error while upserting conversation", error);
        });
      }
    },
    [
      clearOwnership,
      markOwned,
      messageRuntime,
      scope.sessionId,
      sdkRegenerate,
      sdkSetMessages,
      upsertConversation,
    ]
  );

  const actions = useMemo(
    () =>
      ({
        sendMessage,
        cancel,
        regenerate,
      }) satisfies ActiveConversationActions,
    [sendMessage, cancel, regenerate]
  );

  const sourceStatus =
    conversationStoreRef.current?.getState().sourceStatus ??
    EMPTY_CONVERSATION_STATUS;
  const currentView =
    conversationStoreRef.current?.getState().view ?? {
      uuid: scope.sessionId,
      streamStatus: undefined,
      isDataPending: false,
      isDataStale: false,
      isStreaming: false,
      messagesQueue: messagesQueueRef.current,
      isThreadSettled: false,
      pendingAutoScrollMessageId: undefined,
      isLoadingOlder: false,
      loadOlder: () => undefined,
      olderHistoryStatus: "Exhausted",
    };
  const streamStatus = getConversationStreamStatus({
    isNew: scope.isNew,
    sdkStatus,
    threadLiveStatus: thread?.liveStatus,
  });
  const isStreaming = streamStatus === "streaming";
  const isThreadSettled = getLiveStatusKind(streamStatus) === "settled";

  const conversationState = {
    ...currentView,
    uuid: scope.sessionId,
    streamStatus,
    isDataPending: isSkip ? false : isThreadQueryPending || sourceStatus.isPending,
    isDataStale: isSkip ? false : isThreadQueryStale || sourceStatus.isStale,
    isStreaming,
    messagesQueue: messagesQueueRef.current,
    isThreadSettled,
    pendingAutoScrollMessageId: pendingAutoScrollMessageIdRef.current,
  } satisfies ActiveConversationState;

  if (conversationStoreRef.current === null) {
    conversationStoreRef.current = createActiveConversationStore(scope.sessionId, {
      actions,
      sourceStatus,
      view: conversationState,
    });
  }

  const conversationStore = conversationStoreRef.current;
  const messageStore = messageRuntime.getStore();

  conversationStore.getState().replaceActions(actions);
  conversationStore.getState().replaceView(conversationState);

  useEffect(
    () => () => {
      messageRuntime.destroy();
    },
    [messageRuntime]
  );

  return (
    <ActiveConversationStoreContext.Provider value={conversationStore}>
      <ActiveConversationMessageStoreContext.Provider value={messageStore}>
        <ActiveConversationMessageRuntimeBridge
          conversationStore={conversationStore}
          isSkip={isSkip}
          resumeStreamEnabled={resumeStreamEnabled}
          runtime={messageRuntime}
          threadUuid={isSkip ? "skip" : scope.sessionId}
        />
        {children}
      </ActiveConversationMessageStoreContext.Provider>
    </ActiveConversationStoreContext.Provider>
  );
}

function getConversationStreamStatus({
  isNew,
  sdkStatus,
  threadLiveStatus,
}: {
  isNew: boolean;
  sdkStatus: string;
  threadLiveStatus: string | undefined;
}) {
  if (threadLiveStatus === "error") return "error";
  if (threadLiveStatus === "cancelled") return "cancelled";
  if (threadLiveStatus === "completed") return "completed";
  if (sdkStatus === "streaming" || threadLiveStatus === "streaming") {
    return "streaming";
  }
  if (sdkStatus === "submitted" || threadLiveStatus === "pending") {
    return "pending";
  }
  if (isNew) return "new";
}
