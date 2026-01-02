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
  useMemo,
  useState,
} from "react";
import { cvx } from "@/lib/convex/queries";
import type { MaybePromise } from "@/lib/utils";
import { useCvxMutationAuthV3 } from "./queries/convex/utils/use-convex-mutation-0-auth";
import { useThread } from "./queries/use-chat-active-queries";
import { useChatInputActions } from "./use-chat-input";
import { useChatNav } from "./use-chat-nav";
import { useChatContext, useMessages } from "./use-messages";

type ActiveThreadState = {
  uuid: string;
  status: ActiveThreadStatus | undefined;
  messages: MyUIMessage[];
  isPending: boolean;
  isStale: boolean;
  isStreaming: boolean;
  messagesQueue: MyUIMessage[];
  isStreamingOptimistic: boolean;
  isWaitingForFirstToken: boolean;
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
  "messages" | "isPending" | "isStale"
>;
const ActiveTheadMessagesContext =
  createContext<ActiveThreadMessagesType | null>(null);
type ActiveThreadStateType = Pick<
  ActiveThreadState,
  | "messagesQueue"
  | "status"
  | "uuid"
  | "isPending"
  | "isStale"
  | "isStreaming"
  | "isStreamingOptimistic"
  | "isWaitingForFirstToken"
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
  const chatNav = useChatNav();
  const isSkip = chatNav.isNew;

  const {
    data: thread,
    isPending: isThreadPending,
    isStale: isThreadStale,
  } = useThread(isSkip ? "skip" : chatNav.id);

  const {
    messages,
    isPending: isMessagesPending,
    isStale: isMessagesStale,
    applyOptimisticPatch,
    revertOptimisticPatch,
  } = useMessages(isSkip ? "skip" : chatNav.id);

  const isPending = isSkip ? false : isThreadPending || isMessagesPending;
  const isStale = isSkip ? false : isThreadStale || isMessagesStale;
  const isStreaming = thread?.liveStatus === "streaming";
  const isWaitingForFirstToken =
    thread?.liveStatus === "pending" && messages.at(-1)?.role === "user";
  const isStreamingOptimistic = isStreaming || isWaitingForFirstToken;
  const status: ActiveThreadStatus | undefined = useMemo(() => {
    if (chatNav.isNew) return "new";
    if (isThreadPending) return "pending";
    if (thread?.liveStatus === "streaming") return "streaming";
    if (thread?.liveStatus === "completed") return "completed";
    if (thread?.liveStatus === "error") return "error";
    if (thread?.liveStatus === "cancelled") return "cancelled";
  }, [chatNav.isNew, isThreadPending, thread?.liveStatus]);

  const upsertThread = useCvxMutationAuthV3(
    ...cvx.mutationV3.threads.upsert.options()
  );

  const [messagesQueue, setMessagesQueue] = useState<MyUIMessage[]>([]);

  const {
    sendMessage: sdkSendMessage,
    regenerate: sdkRegenerate,
    setMessages: sdkSetMessages,
  } = useChatContext({
    onFinish: () => {
      console.log("DEBUG123: onFinish !!!!!!");
    },
  });

  const __sendMessageInternal = useCallback(
    async (uiMessage: MyUIMessage) => {
      if (chatNav.isNew) chatNav.persistNewChatIdToUrl();
      // TODO: save cleared input to restore in case of error
      inputActions.clear();
      const upsertPromise = upsertThread({
        threadUuid: chatNav.id,
        patch: {
          liveStatus: "pending",
          lastUsedModelId: uiMessage?.metadata?.modelId,
        },
      });
      let patchId: string | undefined;
      console.log("DEBUG123: __sendMessageInternal", chatNav.id);
      try {
        patchId = applyOptimisticPatch(uiMessage);
        sdkSetMessages([]);
        await sdkSendMessage(uiMessage);
      } catch (error) {
        console.error("error while sending message", error);

        // upsertThread might throw if not allowed (because already streaming)
        try {
          await upsertPromise;
          await upsertThread({
            threadUuid: chatNav.id,
            patch: {
              liveStatus: "error",
            },
          });
        } catch (_error) {
          console.error("error while upserting thread", _error);
        }
      } finally {
        if (patchId) revertOptimisticPatch(patchId);

        // upsertThread might throw if not allowed (because already streaming)
        try {
          await upsertPromise;
        } catch (_error) {
          // clear messages shown by optimistic patch only because failure
          sdkSetMessages([]);
          console.error("error while upserting thread", _error);
        }

        console.log("TOTO123: UPSERTED THREAD");
      }
    },
    [
      sdkSendMessage,
      chatNav.isNew,
      chatNav.persistNewChatIdToUrl,
      inputActions.clear,
      upsertThread,
      chatNav.id,
      sdkSetMessages,
      applyOptimisticPatch,
      revertOptimisticPatch,
    ]
  );

  const sendMessage = useCallback(
    (params: SendMessageParams) => {
      const messageId = nanoid();
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
      if (
        thread?.liveStatus === "streaming" ||
        thread?.liveStatus === "pending"
      ) {
        setMessagesQueue((prev) => [...prev, uiMessage]);
      } else {
        return __sendMessageInternal(uiMessage);
      }
    },
    [__sendMessageInternal, thread?.liveStatus]
  );

  const cancel = useCallback(async () => {
    console.log("TODO: cancel");
  }, []);

  const regenerate = useCallback(
    async (messageId: string, options?: RegenerateMessageOptions) => {
      const upsertPromise = upsertThread({
        threadUuid: chatNav.id,
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
        await sdkRegenerate({
          messageId: message.id,
          metadata: {
            selectedModelId: options?.selectedModelId,
          },
        });
      } catch (error) {
        console.error("error while regenerating message", error);
        await upsertPromise;
        await upsertThread({
          threadUuid: chatNav.id,
          patch: {
            liveStatus: "error",
          },
        });
      } finally {
        if (patchId) revertOptimisticPatch(patchId);
        await upsertPromise;
      }
    },
    [
      sdkRegenerate,
      upsertThread,
      chatNav.id,
      messages,
      sdkSetMessages,
      applyOptimisticPatch,
      revertOptimisticPatch,
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
        uuid: chatNav.id,
        status,
        messagesQueue,
        isPending,
        isStale,
        isStreaming,
        isStreamingOptimistic,
        isWaitingForFirstToken,
      }) satisfies ActiveThreadStateType,
    [
      chatNav.id,
      status,
      messagesQueue,
      isPending,
      isStale,
      isStreaming,
      isStreamingOptimistic,
      isWaitingForFirstToken,
    ]
  );

  const messagesState = useMemo(
    () =>
      ({
        messages,
        isPending,
        isStale,
      }) satisfies ActiveThreadMessagesType,
    [messages, isPending, isStale]
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
