import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { type UseChatHelpers, useChat } from "@ai-sdk/react";
import type {
  ChatOnDataCallback,
  ChatOnErrorCallback,
  ChatOnFinishCallback,
  ChatOnToolCallCallback,
} from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { OrpcChatTransport } from "@/lib/chat/OrpcChatTransport";
import { useFpsThrottledValue } from "../utils/use-fps-throttled-state";
import { useLatestRef } from "../utils/use-latest-ref";
import { useValueChangeEffect } from "../utils/use-value-change-effect";

/**
 * CONTEXTS
 */
type AiSdkChatActions = Pick<
  UseChatHelpers<MyUIMessage>,
  | "addToolApprovalResponse"
  | "addToolOutput"
  | "addToolResult"
  | "clearError"
  | "regenerate"
  | "resumeStream"
  | "sendMessage"
  | "setMessages"
  | "stop"
>;

type AiSdkChatState = Pick<
  UseChatHelpers<MyUIMessage>,
  "error" | "id" | "status"
>;

type AiSdkChatMessages = MyUIMessage[];

type AiSdkChatSubscriptions = {
  subscribeOnFinish: (
    callback: ChatOnFinishCallback<MyUIMessage>
  ) => () => void;
  subscribeOnData: (callback: ChatOnDataCallback<MyUIMessage>) => () => void;
  subscribeOnError: (callback: ChatOnErrorCallback) => () => void;
  subscribeOnToolCall: (
    callback: ChatOnToolCallCallback<MyUIMessage>
  ) => () => void;
};

const AiSdkChatActionsContext = createContext<AiSdkChatActions | null>(null);
const AiSdkChatStateContext = createContext<AiSdkChatState | null>(null);
const AiSdkChatMessagesContext = createContext<AiSdkChatMessages | null>(null);
const AiSdkChatSubscriptionsContext =
  createContext<AiSdkChatSubscriptions | null>(null);

/**
 * HOOKS
 */
export function useAiSdkChatActions() {
  const context = useContext(AiSdkChatActionsContext);

  if (!context) {
    throw new Error(
      "useAiSdkChatActionsContext must be used within AiSdkChatProvider"
    );
  }

  return context;
}

export function useAiSdkChatState() {
  const context = useContext(AiSdkChatStateContext);

  if (!context) {
    throw new Error(
      "useAiSdkChatStateContext must be used within AiSdkChatProvider"
    );
  }

  return context;
}

export function useAiSdkChatMessages() {
  const context = useContext(AiSdkChatMessagesContext);

  if (!context) {
    throw new Error(
      "useAiSdkChatMessagesContext must be used within AiSdkChatProvider"
    );
  }

  return context;
}

/**
 * @description
 * Consider using useAiSdkChatHandlers() if you don't want to manually handle subscription lifecycle
 */
export function useAiSdkChatSubscriptions() {
  const context = useContext(AiSdkChatSubscriptionsContext);

  if (!context) {
    throw new Error(
      "useAiSdkChatSubscriptionsContext must be used within AiSdkChatProvider"
    );
  }

  return context;
}

/**
 * @description
 * This hook is simply a helper hook on top of useAiSdkChatSubscriptions
 * so instead of having to manually subscribe/unsubscribe to events, you can
 * simply register callback.
 *
 * @example
 *
 * Allows:
 *
 * ```tsx
 * const handleFinish = useCallback((...args) => console.log('Finish', args), [])
 * useAiSdkChatHandlers({
 *   onFinish: handleFinish
 * })
 * ```
 *
 * Instead of:
 *
 * ```tsx
 * const handleFinish = useCallback((...args) => console.log('Finish', args), [])
 * const { subscribeOnFinish } = useAiSdkChatSubscriptions();
 * useEffect(() => {
 *    const unsubscribe = subscribeOnFinish(handleFinish);
 *    return unsubscribe;
 * }, [subscribeOnFinish, handleFinish]);
 * ```
 */
type UseAiSdkChatOptions = {
  onFinish?: ChatOnFinishCallback<MyUIMessage>;
  onData?: ChatOnDataCallback<MyUIMessage>;
  onError?: ChatOnErrorCallback;
  onToolCall?: ChatOnToolCallCallback<MyUIMessage>;
};
export function useAiSdkChatHandlers({
  onData,
  onError,
  onFinish,
  onToolCall,
}: UseAiSdkChatOptions) {
  const {
    subscribeOnData,
    subscribeOnError,
    subscribeOnFinish,
    subscribeOnToolCall,
  } = useAiSdkChatSubscriptions();

  const onFinishRef = useLatestRef(onFinish);
  const onDataRef = useLatestRef(onData);
  const onErrorRef = useLatestRef(onError);
  const onToolCallRef = useLatestRef(onToolCall);

  useEffect(() => {
    if (!onFinishRef.current) return;
    const unsubscribe = subscribeOnFinish(onFinishRef.current);
    return unsubscribe;
  }, [subscribeOnFinish, onFinishRef.current]);

  useEffect(() => {
    if (!onDataRef.current) return;
    const unsubscribe = subscribeOnData(onDataRef.current);
    return unsubscribe;
  }, [subscribeOnData, onDataRef.current]);

  useEffect(() => {
    if (!onErrorRef.current) return;
    const unsubscribe = subscribeOnError(onErrorRef.current);
    return unsubscribe;
  }, [subscribeOnError, onErrorRef.current]);

  useEffect(() => {
    if (!onToolCallRef.current) return;
    const unsubscribe = subscribeOnToolCall(onToolCallRef.current);
    return unsubscribe;
  }, [subscribeOnToolCall, onToolCallRef.current]);

  return;
}

/**
 * PROVIDER
 */
interface AiSdkChatProviderProps {
  children: React.ReactNode;
  sessionId: string;
}
export function AiSdkChatProvider({
  children,
  sessionId,
}: AiSdkChatProviderProps) {
  // Store listeners in a Ref so they don't trigger re-renders when changed
  const onFinishListenersRef = useRef<Set<ChatOnFinishCallback<MyUIMessage>>>(
    new Set()
  );
  const onDataListenersRef = useRef<Set<ChatOnDataCallback<MyUIMessage>>>(
    new Set()
  );
  const onErrorListenersRef = useRef<Set<ChatOnErrorCallback>>(new Set());
  const onToolCallListenersRef = useRef<
    Set<ChatOnToolCallCallback<MyUIMessage>>
  >(new Set());

  // 2. The "Master" Callback
  const handleFinish: ChatOnFinishCallback<MyUIMessage> = useCallback((e) => {
    // Fan out to all registered listeners
    for (const listener of onFinishListenersRef.current) {
      listener(e);
    }
  }, []);
  const handleData: ChatOnDataCallback<MyUIMessage> = useCallback((e) => {
    for (const listener of onDataListenersRef.current) {
      listener(e);
    }
  }, []);
  const handleError: ChatOnErrorCallback = useCallback((e) => {
    for (const listener of onErrorListenersRef.current) {
      listener(e);
    }
  }, []);
  const handleToolCall: ChatOnToolCallCallback<MyUIMessage> = useCallback(
    (e) => {
      for (const listener of onToolCallListenersRef.current) {
        listener(e);
      }
    },
    []
  );

  // 3. Instantiate the 3rd party hook ONCE here
  const transport = useMemo(() => new OrpcChatTransport(), []);
  const chat = useChat<MyUIMessage>({
    id: sessionId,
    transport,
    onFinish: handleFinish,
    onData: handleData,
    onError: handleError,
    onToolCall: handleToolCall,
  });

  const throttledSdkMessages = useFpsThrottledValue(chat.messages, {
    maxFps: 5,
  });

  // 4. Helper to register listeners
  const subscribeOnFinish = useCallback(
    (callback: ChatOnFinishCallback<MyUIMessage>) => {
      onFinishListenersRef.current.add(callback);
      // Return cleanup function (unsubscribe)
      return () => onFinishListenersRef.current.delete(callback);
    },
    []
  );
  const subscribeOnData = useCallback(
    (callback: ChatOnDataCallback<MyUIMessage>) => {
      onDataListenersRef.current.add(callback);
      return () => onDataListenersRef.current.delete(callback);
    },
    []
  );
  const subscribeOnError = useCallback((callback: ChatOnErrorCallback) => {
    onErrorListenersRef.current.add(callback);
    return () => onErrorListenersRef.current.delete(callback);
  }, []);
  const subscribeOnToolCall = useCallback(
    (callback: ChatOnToolCallCallback<MyUIMessage>) => {
      onToolCallListenersRef.current.add(callback);
      return () => onToolCallListenersRef.current.delete(callback);
    },
    []
  );

  //! IMPORTANT:
  //! clear listeners on sessionId change
  useValueChangeEffect(() => {
    onFinishListenersRef.current.clear();
    onDataListenersRef.current.clear();
    onErrorListenersRef.current.clear();
    onToolCallListenersRef.current.clear();
  }, sessionId);

  const subscriptionsValue = useMemo<AiSdkChatSubscriptions>(
    () => ({
      subscribeOnData,
      subscribeOnError,
      subscribeOnFinish,
      subscribeOnToolCall,
    }),
    [subscribeOnData, subscribeOnError, subscribeOnFinish, subscribeOnToolCall]
  ) satisfies AiSdkChatSubscriptions;

  const actionsValue = useMemo<AiSdkChatActions>(
    () => ({
      addToolApprovalResponse: chat.addToolApprovalResponse,
      addToolOutput: chat.addToolOutput,
      addToolResult: chat.addToolResult,
      clearError: chat.clearError,
      regenerate: chat.regenerate,
      resumeStream: chat.resumeStream,
      sendMessage: chat.sendMessage,
      setMessages: chat.setMessages,
      stop: chat.stop,
    }),
    [
      chat.addToolApprovalResponse,
      chat.addToolOutput,
      chat.addToolResult,
      chat.clearError,
      chat.regenerate,
      chat.resumeStream,
      chat.sendMessage,
      chat.setMessages,
      chat.stop,
    ]
  ) satisfies AiSdkChatActions;

  const stateValue = useMemo<AiSdkChatState>(
    () => ({
      error: chat.error,
      id: chat.id,
      status: chat.status,
    }),
    [chat.error, chat.id, chat.status]
  ) satisfies AiSdkChatState;

  const messagesValue: AiSdkChatMessages =
    throttledSdkMessages ?? chat.messages;

  return (
    <AiSdkChatSubscriptionsContext.Provider value={subscriptionsValue}>
      <AiSdkChatActionsContext.Provider value={actionsValue}>
        <AiSdkChatStateContext.Provider value={stateValue}>
          <AiSdkChatMessagesContext.Provider value={messagesValue}>
            {children}
          </AiSdkChatMessagesContext.Provider>
        </AiSdkChatStateContext.Provider>
      </AiSdkChatActionsContext.Provider>
    </AiSdkChatSubscriptionsContext.Provider>
  );
}
