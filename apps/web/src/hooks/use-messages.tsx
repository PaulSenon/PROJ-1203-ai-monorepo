import { createUiMessageFromChunks } from "@ai-monorepo/ai/libs/createUiMessageFromChunks";
import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { useChat } from "@ai-sdk/react";
import type {
  ChatOnDataCallback,
  ChatOnErrorCallback,
  ChatOnFinishCallback,
  ChatOnToolCallCallback,
} from "ai";
import type { RequestForQueries } from "convex/react";
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
import { OrpcChatTransport } from "@/lib/chat/OrpcChatTransport";
import { cvx } from "@/lib/convex/queries";
import type { Prettify } from "@/lib/utils";
import { useCvxQueriesAuth } from "./queries/convex/utils/use-convex-query-0-auth";
import { useCvxPaginatedQueryCached } from "./queries/convex/utils/use-convex-query-2-cached";
import { useChatNav } from "./use-chat-nav";
import { useFpsThrottledValue } from "./utils/use-fps-throttled-state";

export function useMessages(threadUuid: string | "skip") {
  const isSkip = threadUuid === "skip";

  // 1. Paginated messages
  const paginatedMessages = useCvxPaginatedQueryCached(
    ...cvx.query
      .threadMessagesPaginated({ threadUuid })
      .options.skipWhen(isSkip)
  );

  // 2. Find streaming messages from paginated messages
  const streamingMessages = useMemo(
    () =>
      paginatedMessages.results.filter(
        (m) =>
          m.metadata?.liveStatus === "pending" ||
          m.metadata?.liveStatus === "streaming"
      ),
    [paginatedMessages.results]
  );

  // 3. Query streams for pending messages (using useQueries)
  const streamingMessageQueries = useMemo(() => {
    const queries: RequestForQueries = {};
    for (const m of streamingMessages) {
      const q = cvx.query.findMessageStream({
        threadUuid,
        messageUuid: m.id,
      });
      queries[m.id] = {
        query: q.query,
        args: q.args[0],
      };
    }
    return queries;
  }, [streamingMessages, threadUuid]);
  const streamQueries = useCvxQueriesAuth(streamingMessageQueries) as Record<
    string,
    ReturnType<typeof cvx.query.findMessageStream>["query"]["_returnType"]
  >;

  // 4. Materialize UIMessages from stream deltas
  const streamedMessagesPromises = useMemo(async () => {
    const messages = new Map<string, MyUIMessage>();
    for (const [messageId, chunks] of Object.entries(streamQueries)) {
      if (!chunks) continue;
      // TODO parallelize
      const message = await createUiMessageFromChunks<MyUIMessage>(chunks);
      if (!message) continue;
      messages.set(messageId, message);
    }

    return messages;
  }, [streamQueries]);

  const [streamedMessages, setStreamedMessages] = useState<MyUIMessage[]>([]);
  useEffect(() => {
    streamedMessagesPromises.then((m) => {
      setStreamedMessages(Array.from(m.values()));
    });
  }, [streamedMessagesPromises]);

  // 5. useChat for HTTP streaming (if initiated by this client)
  // const { chat } = useSharedChat();
  const { messages: sdkMessages, status: sdkStatus } = useChatContext();

  const throttledSdkMessages = useFpsThrottledValue(sdkMessages, {
    maxFps: 5,
  });
  const throttledStreamedMessages = useFpsThrottledValue(streamedMessages, {
    maxFps: 5,
  });

  // 6. Merge all messages with throttling
  const messages = useUnifiedMessages(
    paginatedMessages.results,
    throttledStreamedMessages,
    throttledSdkMessages
    // sdkStatus
  );

  useEffect(() => {
    console.log("DEBUG123: messages", structuredClone(messages));
  }, [messages]);

  return useMemo(
    () => ({
      messages,
      isPending: paginatedMessages.isPending,
      isLoading: paginatedMessages.isLoading,
      isStale: paginatedMessages.isStale,
      loadMore: paginatedMessages.loadMore,
      paginatedStatus: paginatedMessages.status,
      streamingStatus: sdkStatus,
      isStreaming: sdkStatus === "streaming" || streamingMessages.length > 0,
    }),
    [
      messages,
      paginatedMessages.isPending,
      paginatedMessages.isLoading,
      paginatedMessages.isStale,
      paginatedMessages.loadMore,
      paginatedMessages.status,
      streamingMessages.length,
      sdkStatus,
    ]
  );
}

// function areMessagesEqual<T extends UIMessage>(a: T, b: T) {
//   return (
//     a.id === b.id &&
//     a.parts.length === b.parts.length &&
//     JSON.stringify(a.parts) === JSON.stringify(b.parts)
//   );
// }

// function useUnifiedMessagesV1(
//   persistedMessages: MyUIMessage[],
//   streamingMessages: MyUIMessage[],
//   httpStreamingMessages: MyUIMessage[]
// ) {
//   // ---------------------------------------------------------------------------
//   // Tier 1: The Base (Rare updates)
//   // Convert array to Map for efficient O(1) access by ID.
//   // ---------------------------------------------------------------------------
//   const baseMap = useMemo(() => {
//     // We create a Map to index messages by ID.
//     // JS Map preserves the order of insertion, so your sort order is safe.
//     const map = new Map<string, MyUIMessage>();
//     for (let i = persistedMessages.length - 1; i >= 0; i--) {
//       const msg = persistedMessages[i];
//       if (!msg) continue;
//       map.set(msg.id, msg);
//     }
//     return map;
//   }, [persistedMessages]);

//   // ---------------------------------------------------------------------------
//   // Tier 2: The Patch (Frequent updates)
//   // Clones the base and applies streaming updates.
//   // ---------------------------------------------------------------------------
//   const mergedWithStreamingMap = useMemo(() => {
//     // Optimization: If no streaming messages, skip the clone overhead
//     if (streamingMessages.length === 0) return baseMap;

//     // Clone the base map (O(N)) to maintain immutability
//     const map = new Map(baseMap);

//     // Apply patches.
//     // - If ID exists: Updates in place (preserves order).
//     // - If ID is new: Appends to the end.
//     for (const msg of streamingMessages) {
//       map.set(msg.id, msg);
//     }

//     return map;
//   }, [baseMap, streamingMessages]);

//   // ---------------------------------------------------------------------------
//   // Tier 3: The Hot Path (Very frequent updates)
//   // Clones the previous result and applies high-frequency updates.
//   // ---------------------------------------------------------------------------
//   const finalMessages = useMemo(() => {
//     // If we have no http updates, we just convert the Tier 2 map to an array.
//     if (httpStreamingMessages.length === 0) {
//       return Array.from(mergedWithStreamingMap.values());
//     }

//     const map = new Map(mergedWithStreamingMap);
//     for (const msg of httpStreamingMessages) {
//       map.set(msg.id, msg);
//     }

//     // Final output must be an array for React rendering
//     const result = Array.from(map.values());
//     return result.sort(compareMessages);
//   }, [mergedWithStreamingMap, httpStreamingMessages]);

//   return finalMessages;
// }

export function useUnifiedMessages(
  persistedMessages: MyUIMessage[],
  streamingMessages: MyUIMessage[],
  httpStreamingMessages: MyUIMessage[]
) {
  // ---------------------------------------------------------------------------
  // Tier 1: The Base Index
  // ---------------------------------------------------------------------------
  const { baseList, baseIdToIndex } = useMemo(() => {
    const list: MyUIMessage[] = [];
    const indexMap = new Map<string, number>();

    // OPTIMIZATION: Single-pass reverse construction.
    // We assume input is [Newest, ..., Oldest].
    // We iterate backwards to build [Oldest, ..., Newest].
    for (let i = persistedMessages.length - 1; i >= 0; i--) {
      const msg = persistedMessages[i];
      // Safety check for sparse arrays or undefined slots
      if (!msg) continue;

      // .push returns the new length, so index is length - 1
      const newIndex = list.push(msg) - 1;

      // Map ID -> Index (Pointer to position in baseList)
      indexMap.set(msg.id, newIndex);
    }

    return { baseList: list, baseIdToIndex: indexMap };
  }, [persistedMessages]);

  // ---------------------------------------------------------------------------
  // Tier 2: The Buffer (Persisted + Streaming)
  // ---------------------------------------------------------------------------
  const { bufferedList, streamingAddedIndices } = useMemo(() => {
    const list = [...baseList];
    const addedIndices = new Map<string, number>();

    for (const msg of streamingMessages) {
      const existingIndex = baseIdToIndex.get(msg.id);

      if (existingIndex !== undefined) {
        list[existingIndex] = msg; // Update in place (preserves sorted position)
      } else {
        // Append to end. We DON'T sort yet.
        // This keeps 'baseIdToIndex' valid for the existing items.
        const newIndex = list.push(msg) - 1;
        addedIndices.set(msg.id, newIndex);
      }
    }

    return { bufferedList: list, streamingAddedIndices: addedIndices };
  }, [baseList, baseIdToIndex, streamingMessages]);

  // ---------------------------------------------------------------------------
  // Tier 3: The Final Merge (Buffer + HTTP -> Sorted)
  // ---------------------------------------------------------------------------
  const finalMessages = useMemo(() => {
    // Fast path: if no HTTP messages, just return the buffer (sorted lightly)
    if (httpStreamingMessages.length === 0) {
      // Ensure buffer is sorted before returning if it's the final output
      // Note: In a real high-perf scenario, we might cache this sort too,
      // but here we assume streamingMessages changes less than HTTP.
      return [...bufferedList].sort(compareMessages);
    }

    const list = [...bufferedList];

    for (const msg of httpStreamingMessages) {
      // Check 1: Is it a "Streaming" item?
      const streamingIndex = streamingAddedIndices.get(msg.id);
      if (streamingIndex !== undefined) {
        list[streamingIndex] = msg;
        continue;
      }

      // Check 2: Is it a "Persisted" item?
      const persistedIndex = baseIdToIndex.get(msg.id);
      if (persistedIndex !== undefined) {
        list[persistedIndex] = msg;
        continue;
      }

      // Check 3: Brand new
      list.push(msg);
    }

    // FINAL STEP: The "Almost Sorted" Sort.
    // Since 'list' is [Sorted Base] + [Appended New Items],
    // the JS engine optimizes this heavily.
    return list.sort(compareMessages);
  }, [
    bufferedList,
    streamingAddedIndices,
    baseIdToIndex,
    httpStreamingMessages,
  ]);

  return useFpsThrottledValue(finalMessages, {
    maxFps: 5,
  });
}

function compareMessages(a: MyUIMessage, b: MyUIMessage) {
  return (
    (a.metadata?.createdAt ?? Date.now()) -
    (b.metadata?.createdAt ?? Date.now())
  );
}

type UseChatContextValue = Prettify<ReturnType<typeof useChat<MyUIMessage>>> & {
  subscribeOnFinish: (
    callback: ChatOnFinishCallback<MyUIMessage>
  ) => () => void;
  subscribeOnData: (callback: ChatOnDataCallback<MyUIMessage>) => () => void;
  subscribeOnError: (callback: ChatOnErrorCallback) => () => void;
  subscribeOnToolCall: (
    callback: ChatOnToolCallCallback<MyUIMessage>
  ) => () => void;
};

const UseChatContext = createContext<UseChatContextValue | null>(null);

// function createChat(id: string) {
//   return new Chat<MyUIMessage>({
//     transport: new OrpcChatTransport(),
//     id,
//   });
// }

export function UseChatProvider({ children }: { children: ReactNode }) {
  const chatNav = useChatNav();
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
  const chatOutput = useChat({
    // chat,
    transport: new OrpcChatTransport(),
    id: chatNav.id,
    onFinish: handleFinish,
    onData: handleData,
    onError: handleError,
    onToolCall: handleToolCall,
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
  const value = useMemo(
    () => ({
      ...chatOutput,
      subscribeOnFinish,
      subscribeOnData,
      subscribeOnError,
      subscribeOnToolCall,
    }),
    [
      chatOutput,
      subscribeOnFinish,
      subscribeOnData,
      subscribeOnError,
      subscribeOnToolCall,
    ]
  );

  return (
    <UseChatContext.Provider value={value}>{children}</UseChatContext.Provider>
  );
}

export const useChatContext = (
  options: {
    onFinish?: ChatOnFinishCallback<MyUIMessage>;
    onData?: ChatOnDataCallback<MyUIMessage>;
    onError?: ChatOnErrorCallback;
    onToolCall?: ChatOnToolCallCallback<MyUIMessage>;
  } = {}
): Omit<
  UseChatContextValue,
  | "subscribeOnFinish"
  | "subscribeOnData"
  | "subscribeOnError"
  | "subscribeOnToolCall"
> => {
  const context = useContext(UseChatContext);
  if (!context) throw new Error("Must be used within UseChatProvider");

  const {
    subscribeOnFinish,
    subscribeOnData,
    subscribeOnError,
    subscribeOnToolCall,
  } = context;
  const { onData, onError, onToolCall, onFinish } = options;

  // 1. Store the latest callback in a Ref.
  // This allows us to access the *current* function without restarting the effect.
  const onFinishRef = useRef(onFinish);
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);
  const onToolCallRef = useRef(onToolCall);

  // 2. Update the ref on every render.
  // (We do this synchronously in render so it's always fresh)
  onFinishRef.current = onFinish;
  onDataRef.current = onData;
  onErrorRef.current = onError;
  onToolCallRef.current = onToolCall;

  useEffect(() => {
    if (!onFinishRef.current) return;
    const unsubscribe = subscribeOnFinish(onFinishRef.current);
    return unsubscribe;
  }, [subscribeOnFinish]); // <--- This dependency is now stable!
  useEffect(() => {
    if (!onDataRef.current) return;
    const unsubscribe = subscribeOnData(onDataRef.current);
    return unsubscribe;
  }, [subscribeOnData]); // <--- This dependency is now stable!
  useEffect(() => {
    if (!onErrorRef.current) return;
    const unsubscribe = subscribeOnError(onErrorRef.current);
    return unsubscribe;
  }, [subscribeOnError]); // <--- This dependency is now stable!
  useEffect(() => {
    if (!onToolCallRef.current) return;
    const unsubscribe = subscribeOnToolCall(onToolCallRef.current);
    return unsubscribe;
  }, [subscribeOnToolCall]); // <--- This dependency is now stable!

  return context;
};
