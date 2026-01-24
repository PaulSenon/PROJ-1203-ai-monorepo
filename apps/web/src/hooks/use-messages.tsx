import { createUiMessageFromChunks } from "@ai-monorepo/ai/libs/createUiMessageFromChunks";
import type {
  MyUIMessage,
  MyUIMessageChunk,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import type { Id } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { useChat } from "@ai-sdk/react";
import type {
  ChatOnDataCallback,
  ChatOnErrorCallback,
  ChatOnFinishCallback,
  ChatOnToolCallCallback,
} from "ai";
import dedent from "dedent";
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
import { useCvxQueryAuthNoCache } from "./queries/convex/utils/use-convex-query-0-auth";
import { useCvxPaginatedQueryStable } from "./queries/convex/utils/use-convex-query-1-stable";
import { useChatNav } from "./use-chat-nav";
import { useUserCacheEntryOnce } from "./use-user-cache";
import { useFpsThrottledValue } from "./utils/use-fps-throttled-state";

function useStreamingUiMessageChunks(threadUuid: string | "skip") {
  const isSkip = threadUuid === "skip";

  const [uiMessageChunks, setUiMessageChunks] = useState<MyUIMessageChunk[]>(
    []
  );
  const [cursor, setCursor] = useState(0);
  const streamIdRef = useRef<Id<"threadStreams"> | null>(null);

  // IMPORTANT: no cache here super important
  // otherwise will keep listening to the old cursor position reactively
  // will accumulate N reactive queries for each cursor position all receiving
  // all subsequent deltas impacting severely the egress, perf, and cache miss on convex.
  // this design intend to trash and replace the n-1 reactive query crafting n query based on n-1 result.
  // this is the pattern inspired from convex agent component streaming pattern,
  // designed to avoid sending all previous chunk on each new delta. So we also shift the cursor
  // while receiving delta and accumulate the previous received ones.
  // this is the most elegant way yet to handle streaming-like with convex reactivity.
  // but this adds quite a lot of complexity so be really careful when modifying this.
  const result = /* DO NOT MODIFY THIS HOOK -> */ useCvxQueryAuthNoCache(
    ...cvx.query
      .getThreadStreamingDelta({ threadUuid, start: cursor })
      .options.skipWhen(isSkip)
  );

  const isPending =
    result === undefined && uiMessageChunks.length === 0 && cursor === 0;

  useEffect(() => {
    // skip if pending
    if (result === undefined) return;
    // reset state if no result
    if (result === null) {
      streamIdRef.current = null;
      setUiMessageChunks([]);
      setCursor(0);
      return;
    }

    // reset state if stream id changes
    if (result.streamId !== streamIdRef.current) {
      streamIdRef.current = result.streamId;
      setUiMessageChunks([]);
      setCursor(0);
      return;
    }

    if (!result.delta) return; // skip if no delta yet
    if (result.delta.chunks.length === 0) return; // skip if no chunks in delta
    if (result.delta.start !== cursor) {
      console.warn(
        dedent`
          Problem detected in convex resumed stream. 
          We passed cursor [${cursor}] expecting the next delta to start with this value
          but we received delta starting at [${result.delta.start}] instead.

          if the received delta start is greater than passed cursor it means we probably skipped some chunks.
            => this will be visible on the UI having missing parts in the rendered UIMessage.
          if the received delta start is less than passed cursor it means we probably showed duplicate chunks.
            => this might not be visible on the UI as the UIMessage reconstruction from chunks might deduplicate them.
          
          This is still a critical problem that must be addressed. 
          You might want to investigate up to the delta streamer logic in api backend.
        `,
        { cursor, result }
      );
    }
    if (result.delta.end <= cursor) return; // skip cursor update that is not strictly increasing

    setUiMessageChunks((prev) =>
      result.delta ? prev.concat(result.delta.chunks) : prev
    );
    setCursor(result.delta.end);
  }, [result, cursor]);

  return useMemo(
    () => ({
      messageChunks: uiMessageChunks,
      streamId: streamIdRef.current,
      isPending: isSkip ? false : isPending,
    }),
    [uiMessageChunks, isPending, isSkip]
  );
}

function useStreamingUiMessage(threadUuid: string | "skip") {
  const isSkip = threadUuid === "skip";
  const stream = useStreamingUiMessageChunks(threadUuid);

  // 1. throttle the message chunks updates to 5fps
  const throttledMessageChunks = useFpsThrottledValue(
    stream.isPending ? "skip" : stream.messageChunks,
    {
      maxFps: 5,
    }
  );

  // The final UIMessage state
  const [streamedMessage, setStreamedMessage] = useState<
    MyUIMessage | undefined
  >(undefined);

  // We react to throttledMessageChunks updates and create the UIMessage from chunks.
  // We must handle potential race conditions by not allowing old resolving promises to set
  // the state after the new one has been created.
  const seq = useRef(0); // to avoid race conditions
  useEffect(() => {
    if (throttledMessageChunks === undefined) {
      setStreamedMessage(undefined);
      return;
    }

    const id = ++seq.current; // to avoid race conditions
    (async () => {
      const msg = await createUiMessageFromChunks<MyUIMessage>(
        throttledMessageChunks
      );
      if (id === seq.current) setStreamedMessage(msg); // to avoid race conditions
    })();
  }, [throttledMessageChunks]);

  return useMemo(
    () => ({
      messages:
        stream.isPending || streamedMessage === undefined
          ? []
          : [streamedMessage], // TODO: skip being array
      isPending: isSkip
        ? false
        : stream.isPending || streamedMessage === undefined,
    }),
    [stream.isPending, streamedMessage, isSkip]
  );
}

function usePersistedMessages(threadUuid: string | "skip") {
  const isSkip = threadUuid === "skip";
  return useCvxPaginatedQueryStable(
    ...cvx.query
      .threadMessagesPaginated({ threadUuid })
      .options.skipWhen(isSkip)
  );
}

function createCacheKey(threadUuid: string) {
  return `messages:${threadUuid}` as const;
}

// TODO: wasn't used and need refactoring since we refactored stream resume
// TODO: we are not reusing things properly. If we change anything in the messages construct process without reflecting changes here, we will have discrepancies...
// TODO: refactor with TS first mindset and then implement to react to we can reuse core.
// Goals:
// - single "useUnifiedMessages" logic
// - single source of queries
// - single source of streamingMessages query parsing (createUiMessageFromChunks)
// export async function preloadMessages(threadUuid: string) {
//   const cacheKey = createCacheKey(threadUuid);

//   // 1. check cache entry
//   const userCache = UserCache.getInstance();
//   const cacheEntry = userCache.entry<MyUIMessage[]>(cacheKey);
//   const value = await cacheEntry.get();
//   if (value !== undefined) {
//     console.log("DEBUG123: CACHE HIT", { cacheKey, value });
//     return value;
//   }

//   // 2. if not found, fetch it
//   // 2.1 fetch persisted messages
//   const persistedMessagesPromise = fetchPaginatedQuery(
//     ...cvx.query.threadMessagesPaginated({ threadUuid }).options.neverSkip()
//   );
//   const streamingMessagesPromise = fetchPaginatedQuery(
//     ...cvx.query
//       .threadStreamingMessagesPaginated({ threadUuid })
//       .options.neverSkip()
//   )
//     .then((deltas) =>
//       Promise.all(
//         deltas.map((chunks) => createUiMessageFromChunks<MyUIMessage>(chunks))
//       )
//     )
//     .then((messages) =>
//       messages.filter((m): m is MyUIMessage => m !== undefined)
//     );

//   const [persistedMessages, streamingMessages] = await Promise.all([
//     persistedMessagesPromise,
//     streamingMessagesPromise,
//   ]);

//   const { list, indexMap } = processPersistedMessages(persistedMessages);
//   for (const msg of streamingMessages) {
//     const existingIndex = indexMap.get(msg.id);
//     if (existingIndex !== undefined) {
//       list[existingIndex] = msg;
//     } else {
//       list.push(msg);
//     }
//   }

//   const res = list.sort(compareMessages);

//   cacheEntry.set(res);

//   return res;
// }

export function useMessages(threadUuid: string | "skip") {
  const isSkip = threadUuid === "skip";

  // 1. Get persisted messages (no cache)
  const paginatedMessages = usePersistedMessages(threadUuid);

  // 2. Get streaming messages (no cache)
  const streamedMessages = useStreamingUiMessage(threadUuid);

  // 3. Get HTTP streaming messages (no cache)
  const httpStreamingMessages = useChatContext();

  type PatchId = string;
  const optimisticPatches = useRef<Map<PatchId, MyUIMessage[]>>(new Map());
  const [optimisticPatchesArray, setOptimisticPatchesArray] = useState<
    MyUIMessage[][]
  >([]);
  const applyOptimisticPatch = useCallback(
    (patch: MyUIMessage[] | MyUIMessage): PatchId => {
      const patchId = crypto.randomUUID();
      const patchMessages = Array.isArray(patch) ? patch : [patch];
      optimisticPatches.current.set(patchId, patchMessages);
      setOptimisticPatchesArray(optimisticPatches.current.values().toArray());
      return patchId;
    },
    []
  );
  const revertOptimisticPatch = useCallback((patchId: PatchId) => {
    optimisticPatches.current.delete(patchId);
    setOptimisticPatchesArray(optimisticPatches.current.values().toArray());
  }, []);

  const patchedPersistedMessages = usePatchedMessages(
    paginatedMessages.results,
    optimisticPatchesArray
  );

  // 6. Merge all messages
  const messages = useUnifiedMessages(
    patchedPersistedMessages,
    streamedMessages.messages,
    httpStreamingMessages.messages
  );

  const cacheKey = useMemo(() => createCacheKey(threadUuid), [threadUuid]);
  const cache = useUserCacheEntryOnce<MyUIMessage[]>(cacheKey);

  const isQueryPending = isSkip
    ? false
    : paginatedMessages.isPending || streamedMessages.isPending;
  // (stable) pending must be false as soon as we have data to show (stale or fresh)
  const isPending = isSkip ? false : cache.isPending;
  // (stable) stale must be true when data are from cache
  const isStale = isSkip ? false : isQueryPending && !cache.isPending;
  // loading turns back to true whenever data loads
  const isLoading = paginatedMessages.isLoading;

  const isStreaming =
    httpStreamingMessages.status === "streaming" ||
    streamedMessages.messages.length > 0;

  const paginatedStatus = paginatedMessages.status; // only the persisted messages status

  // Set cache only with fresh data
  useEffect(() => {
    if (isSkip) return;
    if (isStale) return;
    if (isPending) return;
    cache.set(messages);
  }, [isSkip, isStale, isPending, messages, cache.set]);

  const staleMessages = isStale ? (cache.snapshot ?? []) : messages;

  useEffect(() => {
    console.log("TOTO123: SDLFKSKDJFLKSDJF", {
      isQueryPending,
      isPending,
      isLoading,
      isStale,
      isStreaming,
      messages,
      staleMessages,
    });
  }, [
    isQueryPending,
    isPending,
    isLoading,
    isStale,
    isStreaming,
    messages,
    staleMessages,
  ]);

  return useMemo(
    () => ({
      messages: staleMessages,
      isPending,
      isLoading,
      isStale,
      loadMore: paginatedMessages.loadMore,
      paginatedStatus,
      streamingStatus: httpStreamingMessages.status,
      isStreaming,
      applyOptimisticPatch,
      revertOptimisticPatch,
    }),
    [
      staleMessages,
      isStale,
      isLoading,
      paginatedMessages.loadMore,
      paginatedStatus,
      isStreaming,
      httpStreamingMessages.status,
      isPending,
      applyOptimisticPatch,
      revertOptimisticPatch,
    ]
  );
}

export function usePatchedMessages(
  baseMessages: MyUIMessage[],
  optimisticPatches: MyUIMessage[][]
) {
  const patchedMessages = useMemo(() => {
    // const list = [...baseMessages];
    const list = baseMessages.map(
      (msg): MyUIMessage =>
        ({
          ...msg,
          metadata: {
            ...(msg.metadata as MyUIMessageMetadata),
            dataSource: "convex-persisted",
          },
        }) as MyUIMessage
    );
    const indexMap = new Map<string, number>();
    for (const [index, msg] of list.entries()) {
      indexMap.set(msg.id, index);
    }

    // apply optimistic patches in order patch > messages
    for (const patch of optimisticPatches) {
      for (const msg of patch) {
        const newMsg = {
          ...msg,
          metadata: {
            ...(msg.metadata as MyUIMessageMetadata),
            dataSource: "optimistic",
          },
        } as MyUIMessage;
        const existingIndex = indexMap.get(newMsg.id);
        if (existingIndex !== undefined) {
          list[existingIndex] = newMsg; // Update in place (preserves sorted position)
        } else {
          // Append to end. We DON'T sort yet.
          const newIndex = list.push(newMsg) - 1;
          indexMap.set(newMsg.id, newIndex);
        }
      }
    }
    // remove all messages that might have been patched to non active lifecycleState
    // meaning we want to optimistically deleted them, so we remove them here.
    return list.filter(
      (msg) =>
        msg.metadata?.lifecycleState !== "deleted" &&
        msg.metadata?.lifecycleState !== "archived"
    );
  }, [baseMessages, optimisticPatches]);

  return patchedMessages;
}

function processPersistedMessages(persistedMessages: MyUIMessage[]) {
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

  return { list, indexMap };
}

export function useUnifiedMessages(
  persistedMessages: MyUIMessage[],
  streamingMessages?: MyUIMessage[],
  httpStreamingMessages?: MyUIMessage[]
) {
  // ---------------------------------------------------------------------------
  // Tier 1: The Base Index
  // ---------------------------------------------------------------------------
  const { baseList, baseIdToIndex } = useMemo(() => {
    const { list, indexMap } = processPersistedMessages(persistedMessages);
    return { baseList: list, baseIdToIndex: indexMap };
  }, [persistedMessages]);

  // ---------------------------------------------------------------------------
  // Tier 3: The Buffer (Persisted + Streaming)
  // ---------------------------------------------------------------------------
  const { bufferedList, streamingAddedIndices } = useMemo(() => {
    const list = [...baseList];
    const addedIndices = new Map<string, number>();
    if (!streamingMessages) {
      return {
        bufferedList: list,
        streamingAddedIndices: addedIndices,
      };
    }

    for (const msg of streamingMessages) {
      const existingIndex = baseIdToIndex.get(msg.id);

      const newMsg = {
        ...msg,
        metadata: {
          ...(msg.metadata as MyUIMessageMetadata),
          dataSource: "convex-stream",
        },
      };

      if (existingIndex !== undefined) {
        list[existingIndex] = newMsg;
      } else {
        // Append to end. We DON'T sort yet.
        // This keeps 'optimisticIdToIndex' valid for the existing items.
        const newIndex = list.push(newMsg) - 1;
        addedIndices.set(newMsg.id, newIndex);
      }
    }

    return { bufferedList: list, streamingAddedIndices: addedIndices };
  }, [baseList, baseIdToIndex, streamingMessages]);

  // ---------------------------------------------------------------------------
  // Tier 4: The Final Merge (Buffer + HTTP -> Sorted)
  // ---------------------------------------------------------------------------
  const finalMessages = useMemo(() => {
    // Fast path: if no HTTP messages, just return the buffer (sorted lightly)
    if (
      httpStreamingMessages === undefined ||
      httpStreamingMessages.length === 0
    ) {
      // Ensure buffer is sorted before returning if it's the final output
      // Note: In a real high-perf scenario, we might cache this sort too,
      // but here we assume streamingMessages changes less than HTTP.
      return [...bufferedList].sort(compareMessages);
    }

    const list = [...bufferedList];

    for (const msg of httpStreamingMessages) {
      const newMsg = {
        ...msg,
        metadata: {
          ...(msg.metadata as MyUIMessageMetadata),
          dataSource: "http-stream",
        },
      };

      // Check 1: Is it a "Streaming" item?
      const streamingIndex = streamingAddedIndices.get(newMsg.id);
      if (streamingIndex !== undefined) {
        list[streamingIndex] = newMsg;
        continue;
      }

      // Check 2: Is it a "Persisted" item?
      const persistedIndex = baseIdToIndex.get(newMsg.id);
      if (persistedIndex !== undefined) {
        list[persistedIndex] = newMsg;
        continue;
      }

      // Check 3: Brand new
      list.push(newMsg);
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

  return finalMessages;
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

  useEffect(() => {
    console.log("DEBUG123: chatOutput id", chatOutput.id);
    console.log("DEBUG123: chat nav id", chatNav.id);
  }, [chatOutput.id, chatNav.id]);

  const throttledSdkMessages = useFpsThrottledValue(chatOutput.messages, {
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
  const value = useMemo(
    () => ({
      addToolResult: chatOutput.addToolResult,
      clearError: chatOutput.clearError,
      error: chatOutput.error,
      id: chatOutput.id,
      regenerate: chatOutput.regenerate,
      resumeStream: chatOutput.resumeStream,
      sendMessage: chatOutput.sendMessage,
      setMessages: chatOutput.setMessages,
      status: chatOutput.status,
      stop: chatOutput.stop,
      messages: throttledSdkMessages ?? [],
      subscribeOnFinish,
      subscribeOnData,
      subscribeOnError,
      subscribeOnToolCall,
    }),
    [
      chatOutput.addToolResult,
      chatOutput.clearError,
      chatOutput.error,
      chatOutput.id,
      chatOutput.regenerate,
      chatOutput.resumeStream,
      chatOutput.sendMessage,
      chatOutput.setMessages,
      chatOutput.status,
      chatOutput.stop,
      subscribeOnFinish,
      subscribeOnData,
      subscribeOnError,
      subscribeOnToolCall,
      throttledSdkMessages,
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
): Prettify<
  Omit<
    UseChatContextValue,
    | "subscribeOnFinish"
    | "subscribeOnData"
    | "subscribeOnError"
    | "subscribeOnToolCall"
  >
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
