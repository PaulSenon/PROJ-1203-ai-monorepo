import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { api } from "@ai-monorepo/convex/convex/_generated/api";
import { useChat } from "@ai-sdk/react";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { useQuery } from "convex/react";
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
import type { MaybePromise } from "@/lib/utils";
import { chatRpc } from "@/utils/orpc/orpc";
import { useAuth } from "./use-auth";
import { useChatInput } from "./use-chat-input";
import { useChatNav } from "./use-chat-nav";

type ActiveThreadState = {
  uuid: string;
  streamStatus: "error" | "cancelled" | "pending" | "streaming" | "completed";
  dataStatus: "pending" | "stale" | "fresh" | "error";
  messages: MyUIMessage[];
  messagesQueue: MyUIMessage[];
};

type SendMessageParams = {
  text: string;
  // attachments?: FileUIPart[];
  options?: {
    selectedModelId?: string;
  };
};

type ActiveThreadActions = {
  sendMessage: (params: SendMessageParams) => MaybePromise<void>;
  cancel: () => MaybePromise<void>;
  regenerate: (messageId: string) => MaybePromise<void>;
};

const ActiveTheadMessagesContext = createContext<
  ActiveThreadState["messages"] | null
>(null);
const ActiveTheadStateContext = createContext<Pick<
  ActiveThreadState,
  "messagesQueue" | "dataStatus" | "streamStatus" | "uuid"
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
  const messages = useContext(ActiveTheadMessagesContext);
  if (!messages) {
    throw new Error(
      "useActiveThreadMessages must be used within ActiveThreadProvider"
    );
  }
  return messages;
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
  const inputState = useChatInput();
  const { isFullyReady } = useAuth();
  const chatNav = useChatNav();
  const isSkip = !isFullyReady || chatNav.isNew;
  const thread = useQuery(
    api.chat.getThread,
    isSkip ? "skip" : { threadUuid: chatNav.id }
  );
  const messagesPersisted = useQuery(
    api.chat.getAllThreadMessagesAsc,
    isSkip ? "skip" : { threadUuid: chatNav.id }
  );

  const [messagesQueue, setMessagesQueue] = useState<MyUIMessage[]>([]);

  const {
    messages: messagesStreamed,
    sendMessage: sdkSendMessage,
    regenerate: sdkRegenerate,
    status: sdkStatus,
    setMessages: sdkSetMessages,
  } = useChat<MyUIMessage>({
    id: chatNav.id,
    transport: {
      async sendMessages(options) {
        const lastMessage = options.messages.at(-1);
        if (!lastMessage) throw new Error("No message to send");
        return eventIteratorToUnproxiedDataStream(
          await chatRpc.chat(
            {
              uuid: options.chatId,
              message: lastMessage,
              // TODO: type safety
              selectedModelId: lastMessage.metadata?.modelId as AllowedModelIds,
            },
            { signal: options.abortSignal }
          )
        );
      },
      reconnectToStream() {
        throw new Error("Unsupported");
      },
    },
    generateId: () => nanoid(),
    onFinish: ({ isAbort, isDisconnect, isError }) => {
      if (!(isAbort || isDisconnect || isError)) {
        trySendNextQueuedMessage();
      }
    },
  });

  useEffect(() => {
    if (thread?.liveStatus !== "completed") return;
    if (!messagesPersisted) return;
    sdkSetMessages(messagesPersisted);
  }, [thread?.liveStatus, messagesPersisted, sdkSetMessages]);

  const lastSentMessageIdRef = useRef<string | null>(null);
  // TODO: rewrite this, it's not working (don't show streaming messages)
  const messages = useMemo(() => {
    if (!messagesPersisted) return [];
    if (sdkStatus === "ready") return messagesPersisted;

    const incompleteAiMessage =
      sdkStatus === "streaming" || sdkStatus === "submitted"
        ? messagesStreamed.findLast(
            (m) => m.id === lastSentMessageIdRef.current
          )
        : undefined;
    const combinedMessages = messagesPersisted.map((m) => {
      if (incompleteAiMessage?.id === m.id) {
        return incompleteAiMessage;
      }
      return m;
    });

    return combinedMessages;
  }, [messagesPersisted, messagesStreamed, sdkStatus]);

  const __sendMessageInternal = useCallback(
    (uiMessage: MyUIMessage) => {
      lastSentMessageIdRef.current = uiMessage.id;
      if (chatNav.isNew) chatNav.persistNewChatIdToUrl();
      inputState.clear();
      return sdkSendMessage(uiMessage);
    },
    [sdkSendMessage, chatNav.isNew, chatNav.persistNewChatIdToUrl]
  );

  const trySendNextQueuedMessage = useCallback(() => {
    const nextMessage = messagesQueue[0];
    if (!nextMessage) return;
    setMessagesQueue((prev) => prev.slice(1));
    return __sendMessageInternal(nextMessage);
  }, [messagesQueue, __sendMessageInternal]);

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
    (messageId: string) => sdkRegenerate({ messageId }),
    [sdkRegenerate]
  );

  useEffect(() => {
    console.log("messagesStreamed", messagesStreamed);
  }, [messagesStreamed]);

  const actions = {
    sendMessage,
    cancel,
    regenerate,
  } satisfies ActiveThreadActions;

  const state = {
    uuid: chatNav.id,
    streamStatus: thread?.liveStatus ?? "pending",
    dataStatus: thread === undefined ? "pending" : "fresh",
    messagesQueue,
  } satisfies Omit<ActiveThreadState, "messages">;

  return (
    <ActiveTheadActionsContext.Provider value={actions}>
      <ActiveTheadStateContext.Provider value={state}>
        {/* TODO: rewire to messages */}
        <ActiveTheadMessagesContext.Provider value={messagesStreamed}>
          {children}
        </ActiveTheadMessagesContext.Provider>
      </ActiveTheadStateContext.Provider>
    </ActiveTheadActionsContext.Provider>
  );
}
