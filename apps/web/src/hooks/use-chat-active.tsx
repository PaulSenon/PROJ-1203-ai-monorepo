import { createOptimisticStepStartMessage } from "@ai-monorepo/ai/helpers";
import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import { nanoid } from "nanoid";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChatSessionScope } from "@/components/providers/4-chat-session-scope";
import { cvx } from "@/lib/convex/queries";
import type { MaybePromise } from "@/lib/utils";
import {
  useAiSdkChatActions,
  useAiSdkChatHandlers,
  useAiSdkChatState,
} from "./chat/use-ai-sdk-chat";
import { useChatNavActions } from "./chat/use-chat-nav";
import { useCvxMutationAuthV3 } from "./queries/convex/utils/use-convex-mutation-0-auth";
import { useThread } from "./queries/use-chat-active-queries";
import { useChatInputActions } from "./use-chat-input";
import { useMessages } from "./use-messages";
import { getLiveStatusKind, useStreamOwnership } from "./use-stream-ownership";

type ActiveThreadState = {
  uuid: string;
  streamStatus: ActiveThreadStatus | undefined;
  messages: MyUIMessage[];
  isDataPending: boolean;
  isDataStale: boolean;
  isStreaming: boolean;
  messagesQueue: MyUIMessage[];
  // isStreamingOptimistic: boolean;
  // isWaitingForFirstToken: boolean;
  isThreadSettled: boolean;
  pendingAutoScrollMessageId: string | undefined;
};

type SendMessageParams = {
  text: string;
  // attachments?: FileUIPart[];
  options?: {
    selectedModelId?: AllowedModelIds;
  };
};

type RegenerateMessageOptions = {
  selectedModelId?: string;
};

type ActiveThreadActions = {
  sendMessage: (params: SendMessageParams) => MaybePromise<void>;
  cancel: () => MaybePromise<void>;
  regenerate: (
    messageId: string,
    options?: RegenerateMessageOptions
  ) => MaybePromise<void>;
};

type ActiveThreadMessagesType = Pick<
  ActiveThreadState,
  "messages" | "isDataPending" | "isDataStale"
> & {
  isLoadingOlder: ReturnType<typeof useMessages>["isLoading"];
  olderHistoryStatus: ReturnType<typeof useMessages>["paginatedStatus"];
  loadOlder: ReturnType<typeof useMessages>["loadMore"];
};
const ActiveTheadMessagesContext =
  createContext<ActiveThreadMessagesType | null>(null);
type ActiveThreadStateType = Pick<
  ActiveThreadState,
  | "messagesQueue"
  | "streamStatus"
  | "uuid"
  | "isDataPending"
  | "isDataStale"
  | "isStreaming"
  // | "isStreamingOptimistic"
  // | "isWaitingForFirstToken"
  | "isThreadSettled"
  | "pendingAutoScrollMessageId"
>;
const ActiveTheadStateContext = createContext<ActiveThreadStateType | null>(
  null
);
const ActiveTheadActionsContext = createContext<ActiveThreadActions | null>(
  null
);

export function useActiveThreadState() {
  const state = useContext(ActiveTheadStateContext);
  if (!state) {
    throw new Error(
      "useActiveThreadState must be used within ActiveThreadProvider"
    );
  }
  return state;
}

export function useActiveThreadMessages() {
  const state = useContext(ActiveTheadMessagesContext);
  if (!state) {
    throw new Error(
      "useActiveThreadMessages must be used within ActiveThreadProvider"
    );
  }
  return state;
}

export function useActiveThreadActions() {
  const actions = useContext(ActiveTheadActionsContext);
  if (!actions) {
    throw new Error(
      "useActiveThreadActions must be used within ActiveThreadProvider"
    );
  }
  return actions;
}

type ActiveThreadStatus =
  | "new"
  | "pending"
  | "streaming"
  | "completed"
  | "error"
  | "cancelled";

export function ActiveThreadProvider({ children }: { children: ReactNode }) {
  const inputActions = useChatInputActions();
  const chatNavAction = useChatNavActions();
  const scope = useChatSessionScope();
  const isSkip = scope.isNew;

  const {
    data: thread,
    isPending: isThreadQueryPending,
    isStale: isThreadQueryStale,
  } = useThread(isSkip ? "skip" : scope.sessionId);

  // TODO start: from here to "TODO end" should move this in a separate hook/function for readability
  const { isLocalOwned, markOwned, clearOwnership } = useStreamOwnership({
    threadUuid: isSkip ? "skip" : scope.sessionId,
    liveStatus: thread?.liveStatus,
    isThreadQueryPending,
  });
  // NB: This is normal to use thread.liveStatus here and not streamStatus aggregate
  const liveStatusKind = getLiveStatusKind(thread?.liveStatus);
  const resumeStreamEnabled =
    !(isSkip || isThreadQueryPending || isLocalOwned) &&
    liveStatusKind === "ongoing";
  // TODO end

  const {
    messages,
    isPending: isMessagesQueryPending,
    isStale: isMessagesStale,
    isLoading: isLoadingOlder,
    loadMore,
    paginatedStatus,
    applyOptimisticPatch,
    revertOptimisticPatch,
  } = useMessages({
    threadUuid: isSkip ? "skip" : scope.sessionId,
    resumeStreamEnabled,
  });

  const upsertPromiseRef = useRef<Promise<unknown>>(Promise.resolve());
  const [messagesQueue, _setMessagesQueue] = useState<MyUIMessage[]>([]);
  const {
    sendMessage: sdkSendMessage,
    regenerate: sdkRegenerate,
    setMessages: sdkSetMessages,
  } = useAiSdkChatActions();
  const { status: sdkStatus } = useAiSdkChatState();
  useAiSdkChatHandlers({
    onError: async (error) => {
      console.error("sdkChatError", error);
      clearOwnership();

      // upsertThread might throw if not allowed (because already streaming)
      await upsertPromiseRef.current.catch((e) => {
        console.error("Error in previous upsert", e);
      });
      await upsertThread({
        threadUuid: scope.sessionId,
        patch: {
          liveStatus: "error",
        },
      }).catch((e) => {
        console.error(
          "Error attempting to update thread liveStatus to error from client",
          e
        );
      });
    },
  });

  const [pendingAutoScrollMessageId, setPendingAutoScrollMessageId] = useState<
    string | undefined
  >();

  // Requests data status (pending -> stale -> fresh)
  const isDataPending = isSkip
    ? false
    : isThreadQueryPending || isMessagesQueryPending;
  const isDataStale = isSkip ? false : isThreadQueryStale || isMessagesStale;

  // Streaming status (!== request data)
  const streamStatus: ActiveThreadStatus | undefined = useMemo(() => {
    // if (isThreadQueryPending) return undefined;

    if (thread?.liveStatus === "error") return "error";
    if (thread?.liveStatus === "cancelled") return "cancelled";
    if (thread?.liveStatus === "completed") return "completed";
    if (sdkStatus === "streaming" || thread?.liveStatus === "streaming")
      return "streaming";
    if (sdkStatus === "submitted" || thread?.liveStatus === "pending")
      return "pending";
    if (scope.isNew) return "new";
  }, [scope.isNew, thread?.liveStatus, sdkStatus]);
  const streamStatusKing = getLiveStatusKind(streamStatus); // TODO: getLiveStatusKind was supposed to be used with liveStatus type not ActiveThreadStatus. Temp hack before we unify this "status" reducer we need everywhere.
  const isStreaming = streamStatus === "streaming";
  // TODO: perhaps no longer useful since we have optimistic agent response now.
  // const isWaitingForFirstToken =
  //   streamStatusKing === "ongoing" && messages.at(-1)?.role === "user";
  // const isStreamingOptimistic = isStreaming || isWaitingForFirstToken;

  const upsertThread = useCvxMutationAuthV3(
    ...cvx.mutationV3.threads.upsert.options()
  );

  // TODO: make a single shared reducer in ai packages for this (we already have a similar implementation on api side)
  // TOTO NB: I think they miss-align on the "undefined" case though. Backend "undefined" handling change, might break things from what I vaguely remember. So if we ever need to change it, we gotta deeply analyze potential impacts.
  const isThreadSettled = streamStatusKing === "settled";
  // later remark linked to above todo, we should also handle undefined as settled to avoid having the last assistant min-height latching on pageload 100% of the time. Or we should also handle data loading state to only read when ready. To be defined.

  const __sendMessageInternal = useCallback(
    async (uiMessage: MyUIMessage, nextMessageId: string) => {
      if (scope.isNew) chatNavAction.persistNewChatIdToUrl();

      const optimisticNextMessage =
        createOptimisticStepStartMessage(nextMessageId);

      // TODO: save cleared input to restore in case of error
      inputActions.clear();
      console.log("TOTO123: UPSERTING THREAD...");
      upsertPromiseRef.current = upsertThread({
        threadUuid: scope.sessionId,
        patch: {
          liveStatus: "pending",
          lastUsedModelId: uiMessage?.metadata?.modelId,
        },
      });
      let patchId: string | undefined;
      console.log("DEBUG123: __sendMessageInternal", scope.sessionId);
      try {
        const msgs = [uiMessage, optimisticNextMessage];
        console.log("TOTO123: APPLIED OPTIMISTIC PATCH", msgs);
        patchId = applyOptimisticPatch(msgs);
        setPendingAutoScrollMessageId(optimisticNextMessage.id);
        console.log("TOTO123: SDK SET SDK MESSAGES []");
        sdkSetMessages([]);
        markOwned();
        await sdkSendMessage(uiMessage, {
          metadata: {
            nextMessageId,
          },
        });
      } catch (error) {
        // TODO: This sucks so we need to fork useChat to handle this properly
        //! IMPORTANT:
        //! sdkSendMessage is almost never throwing (can only throw before request is sent)
        //! for sdkSendMessage error handling, this must be implemented in onError.
        clearOwnership();
        console.error("error while sending message", error);
      } finally {
        console.log("TOTO123: REVERTING OPTIMISTIC PATCH", patchId);
        if (patchId) revertOptimisticPatch(patchId);
        // TODO: This is not frame perfect. We should ultimately flush the stream messages when we have the persisted ones. Perhaps we need some abstraction on sendMessage or something to handle proper lifecycle. Or any better things That would allow handling when everything is fully done. Or at least a `await persisted(...)` before. Be careful with dead-lock and do not to mess around with stream ownership though.
        sdkSetMessages([]);
        // upsertThread might throw if not allowed (because already streaming)
        await upsertPromiseRef.current.catch((error) => {
          console.error("error while upserting thread", error);
        });

        console.log("TOTO123: UPSERTED THREAD");
      }
    },
    [
      sdkSendMessage,
      scope.isNew,
      chatNavAction.persistNewChatIdToUrl,
      inputActions.clear,
      upsertThread,
      scope.sessionId,
      sdkSetMessages,
      applyOptimisticPatch,
      revertOptimisticPatch,
      markOwned,
      clearOwnership,
    ]
  );

  const sendMessage = useCallback(
    (params: SendMessageParams) => {
      const messageId = nanoid();
      const nextMessageId = nanoid();
      const uiMessage: MyUIMessage = {
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
      };
      // TODO: enable queuing later
      // if (
      //   thread?.liveStatus === "streaming" ||
      //   thread?.liveStatus === "pending"
      // ) {
      //   setMessagesQueue((prev) => [...prev, uiMessage]);
      // } else {
      return __sendMessageInternal(uiMessage, nextMessageId);
      // }
    },
    [__sendMessageInternal]
  );

  const cancel = useCallback(async () => {
    console.log("TODO: cancel");
  }, []);

  const regenerate = useCallback(
    async (messageId: string, options?: RegenerateMessageOptions) => {
      const upsertPromise = upsertThread({
        threadUuid: scope.sessionId,
        patch: {
          liveStatus: "pending",
          lastUsedModelId: options?.selectedModelId,
        },
      });
      let patchId: string | undefined;
      try {
        // [U1, A1, U2, A2, U3, A3, A4, U4, A5, U5] => messageId === A4
        // => messageIndex === 6 (A4)
        let messageIndex = messages.findIndex((m) => m.id === messageId);
        while (
          messageIndex > 0 &&
          messages[messageIndex]?.role === "assistant"
        ) {
          // [U1, A1, U2, A2, U3, A3, A4, U4, A5, U5]
          // => i === 6                ^
          // [U1, A1, U2, A2, U3, A3, A4, U4, A5, U5]
          // => i === 5            ^
          // [U1, A1, U2, A2, U3, A3, A4, U4, A5, U5]
          // => i === 4        ^
          messageIndex--;
        }
        // => messageIndex === 4 (U3)
        const firstUserMessageBeforeMessageToRegenerate = messageIndex;
        const message = messages[firstUserMessageBeforeMessageToRegenerate];
        // => message === U3
        const messagesToRemovePatched = messages
          .slice(firstUserMessageBeforeMessageToRegenerate + 1)
          .map(
            (m): MyUIMessage => ({
              ...m,
              metadata: {
                ...(m.metadata as MyUIMessageMetadata),
                lifecycleState: "deleted",
              },
            })
          );
        // => messagesToRemovePatched === [A3, A4, U4, A5, U5]
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
        patchId = applyOptimisticPatch(messagesToRemovePatched);
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
        await upsertThread({
          threadUuid: scope.sessionId,
          patch: {
            liveStatus: "error",
          },
        });
      } finally {
        if (patchId) revertOptimisticPatch(patchId);
        sdkSetMessages([]); // TODO if we keep this we might remove the one in catch below
        await upsertPromise.catch((error) => {
          console.error("error while upserting thread", error);
        });
      }
    },
    [
      sdkRegenerate,
      upsertThread,
      scope.sessionId,
      messages,
      sdkSetMessages,
      applyOptimisticPatch,
      revertOptimisticPatch,
      markOwned,
      clearOwnership,
    ]
  );

  const actions = useMemo(
    () =>
      ({
        sendMessage,
        cancel,
        regenerate,
      }) satisfies ActiveThreadActions,
    [sendMessage, cancel, regenerate]
  );

  const state = useMemo(
    () =>
      ({
        uuid: scope.sessionId,
        streamStatus,
        messagesQueue,
        isDataPending,
        isDataStale,
        isStreaming,
        // isStreamingOptimistic,
        // isWaitingForFirstToken,
        isThreadSettled,
        pendingAutoScrollMessageId,
      }) satisfies ActiveThreadStateType,
    [
      scope.sessionId,
      streamStatus,
      messagesQueue,
      isDataPending,
      isDataStale,
      isStreaming,
      // isStreamingOptimistic,
      // isWaitingForFirstToken,
      isThreadSettled,
      pendingAutoScrollMessageId,
    ]
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log("DEBUG: use-chat-active state", {
      state,
      messages: messages.slice(-4),
    });
  }, [state, messages]);

  const messagesState = useMemo(
    () =>
      ({
        messages,
        isDataPending,
        isDataStale,
        isLoadingOlder,
        olderHistoryStatus: paginatedStatus,
        loadOlder: loadMore,
      }) satisfies ActiveThreadMessagesType,
    [
      messages,
      isDataPending,
      isDataStale,
      isLoadingOlder,
      paginatedStatus,
      loadMore,
    ]
  );

  return (
    <ActiveTheadActionsContext.Provider value={actions}>
      <ActiveTheadStateContext.Provider value={state}>
        {/* TODO: rewire to messages */}
        <ActiveTheadMessagesContext.Provider value={messagesState}>
          {children}
        </ActiveTheadMessagesContext.Provider>
      </ActiveTheadStateContext.Provider>
    </ActiveTheadActionsContext.Provider>
  );
}
