import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { nanoid } from "nanoid";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cvx } from "@/lib/convex/queries";
import type { MaybePromise } from "@/lib/utils";
import { useCvxMutationAuthV3 } from "./queries/convex/utils/use-convex-mutation-0-auth";
import { setPaginatedQueryCache } from "./queries/convex/utils/use-convex-query-2-cached";
import {
  useActiveThreadMessagesQuery,
  useActiveThreadQuery,
} from "./queries/use-chat-active-queries";
import { useChatInputActions } from "./use-chat-input";
import { useChatNav } from "./use-chat-nav";
import { useChatContext, useMessages } from "./use-messages";

type ActiveThreadState = {
  uuid: string;
  streamStatus: "error" | "cancelled" | "pending" | "streaming" | "completed";
  dataStatus: "pending" | "stale" | "fresh" | "error";
  messages: MyUIMessage[];
  isPending: boolean;
  isStale: boolean;
  messagesQueue: MyUIMessage[];
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

const ActiveTheadMessagesContext = createContext<Pick<
  ActiveThreadState,
  "messages" | "isPending"
> | null>(null);
const ActiveTheadStateContext = createContext<Pick<
  ActiveThreadState,
  "messagesQueue" | "dataStatus" | "streamStatus" | "uuid" | "isPending"
> | null>(null);
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

export function ActiveThreadProvider({ children }: { children: ReactNode }) {
  const inputActions = useChatInputActions();
  const chatNav = useChatNav();
  const isSkip = chatNav.isNew;
  // TODO: perhaps we should handle stale case ???
  const {
    data: thread,
    isPending: isThreadPending,
    isStale: isThreadStale,
  } = useActiveThreadQuery();
  const {
    messages,
    isPending: isMessagesPending,
    isStale: isMessagesStale,
  } = useMessages(isSkip ? "skip" : chatNav.id);
  useActiveThreadMessagesQuery();
  const isPending = isSkip ? false : isThreadPending || isMessagesPending;
  const isStale = isSkip ? false : isThreadStale || isMessagesStale;

  const upsertThread = useCvxMutationAuthV3(
    ...cvx.mutationV3.threads.upsert.options()
  );

  // console.log("messagesPersisted", messagesPersisted);
  // console.log("thread", thread);

  const [messagesQueue, setMessagesQueue] = useState<MyUIMessage[]>([]);

  useEffect(() => {
    setPaginatedQueryCache(
      messages,
      ...cvx.query
        .threadMessagesPaginated({ threadUuid: chatNav.id })
        .options.neverSkip()
    );
  }, [messages, chatNav.id]);

  // const { chat } = useSharedChat();
  const {
    sendMessage: sdkSendMessage,
    regenerate: sdkRegenerate,
    setMessages: sdkSetMessages,
  } = useChatContext({
    onFinish: () => {
      console.log("DEBUG123: onFinish !!!!!!");
      // sdkSetMessages([]);
    },
  });

  const __sendMessageInternal = useCallback(
    (uiMessage: MyUIMessage) => {
      if (chatNav.isNew) chatNav.persistNewChatIdToUrl();
      inputActions.clear();
      upsertThread({
        threadUuid: chatNav.id,
        patch: {
          liveStatus: "streaming",
          lastUsedModelId: uiMessage?.metadata?.modelId,
        },
      });
      sdkSetMessages([]);
      return sdkSendMessage(uiMessage);
    },
    [
      sdkSendMessage,
      chatNav.isNew,
      chatNav.persistNewChatIdToUrl,
      inputActions.clear,
      upsertThread,
      chatNav.id,
      sdkSetMessages,
    ]
  );

  // const trySendNextQueuedMessage = useCallback(() => {
  //   const nextMessage = messagesQueue[0];
  //   if (!nextMessage) return;
  //   setMessagesQueue((prev) => prev.slice(1));
  //   return __sendMessageInternal(nextMessage);
  // }, [messagesQueue, __sendMessageInternal]);

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
          liveStatus: "streaming",
          lastUsedModelId: options?.selectedModelId,
        },
      });
      try {
        let messageIndex = messages.findIndex((m) => m.id === messageId);
        while (
          messageIndex > 0 &&
          messages[messageIndex]?.role === "assistant"
        ) {
          messageIndex--;
        }
        const message = messages[messageIndex];
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
        await upsertPromise;
      }
    },
    [sdkRegenerate, upsertThread, chatNav.id, messages, sdkSetMessages]
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
        streamStatus: thread?.liveStatus ?? "pending",
        dataStatus: isThreadPending ? "pending" : "fresh",
        messagesQueue,
        isPending,
        isStale,
      }) satisfies Omit<ActiveThreadState, "messages">,
    [chatNav.id, thread, messagesQueue, isPending, isThreadPending, isStale]
  );

  const messagesState = useMemo(
    () => ({
      messages,
      isPending,
      isStale,
    }),
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
