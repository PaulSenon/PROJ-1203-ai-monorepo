import { createUiMessageFromChunks } from "@ai-monorepo/ai/libs/createUiMessageFromChunks";
import type {
  MessageDataSource,
  MyUIMessage,
  MyUIMessageChunk,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import type { Id } from "@ai-monorepo/convex/convex/_generated/dataModel";
import dedent from "dedent";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cvx } from "@/lib/convex/queries";
import { useCvxQueryAuthNoCache } from "./queries/convex/utils/use-convex-query-0-auth";
import { useCvxPaginatedQueryStable } from "./queries/convex/utils/use-convex-query-1-stable";
import { useChatContext } from "./use-messages-legacy";
import { useUserCacheEntryOnce } from "./use-user-cache";
import { useFpsThrottledValue } from "./utils/use-fps-throttled-state";

// NormalizedMessages must be oldest -> newest for merge perf.
declare const normalizedMessagesBrand: unique symbol;
type NormalizedMessages = MyUIMessage[] & {
  readonly [normalizedMessagesBrand]: true;
};

type NormalizeOptions = {
  reverse?: boolean;
  debugLabel?: string;
};

const emptyNormalizedMessages: NormalizedMessages =
  [] as unknown as NormalizedMessages;

function normalizeMessages(
  messages: MyUIMessage[] | undefined,
  options: NormalizeOptions = {}
): NormalizedMessages {
  if (!messages || messages.length === 0) return emptyNormalizedMessages;
  const normalized = options.reverse ? [...messages].reverse() : messages;
  warnIfNotNormalized(normalized, options.debugLabel);
  return normalized as NormalizedMessages;
}

function warnIfNotNormalized(messages: MyUIMessage[], label?: string) {
  if (!import.meta.env.DEV) return;
  if (!label) return;
  if (messages.length < 2) return;

  const sampleCount = Math.min(messages.length - 1, 3);
  for (let i = 0; i < sampleCount; i++) {
    const prev = messages[i];
    const next = messages[i + 1];
    if (!(prev && next)) continue;
    if ((prev.metadata?.createdAt ?? 0) > (next.metadata?.createdAt ?? 0)) {
      console.warn(
        `[useMessagesV2] ${label} not normalized (oldest -> newest).`
      );
      return;
    }
  }
}

function isOngoingLiveStatus(liveStatus: MyUIMessageMetadata["liveStatus"]) {
  return liveStatus === "pending" || liveStatus === "streaming";
}

type MessageLayer = {
  messages: NormalizedMessages;
  dataSource?: MessageDataSource;
};

type MergeOptions = {
  sort?: boolean;
};

function mergeMessageLayers(
  layers: MessageLayer[],
  options: MergeOptions = {}
): MyUIMessage[] {
  if (layers.length === 0) return [];

  const [baseLayer, ...rest] = layers;
  const baseMessages = baseLayer?.messages ?? emptyNormalizedMessages;
  const list: MyUIMessage[] = baseLayer?.dataSource
    ? baseMessages.map((msg) => withDataSource(msg, baseLayer.dataSource))
    : [...baseMessages];
  const indexMap = new Map<string, number>();

  for (let i = 0; i < list.length; i++) {
    const msg = list[i];
    if (!msg) continue;
    indexMap.set(msg.id, i);
  }

  for (const layer of rest) {
    if (layer.messages.length === 0) continue;
    for (const msg of layer.messages) {
      const nextMsg = layer.dataSource
        ? withDataSource(msg, layer.dataSource)
        : msg;
      const existingIndex = indexMap.get(nextMsg.id);
      if (existingIndex !== undefined) {
        list[existingIndex] = nextMsg;
        continue;
      }
      const newIndex = list.push(nextMsg) - 1;
      indexMap.set(nextMsg.id, newIndex);
    }
  }

  const filtered = list.filter(
    (msg) =>
      msg.metadata?.lifecycleState !== "deleted" &&
      msg.metadata?.lifecycleState !== "archived"
  );

  if (options.sort === false || filtered.length <= 1) return filtered;
  return filtered.sort(compareMessages);
}

function withDataSource(message: MyUIMessage, dataSource?: MessageDataSource) {
  if (!dataSource) return message;
  const currentDataSource = message.metadata?.debug?.dataSource;
  if (currentDataSource === dataSource) return message;

  return {
    ...message,
    metadata: {
      ...message.metadata,
      debug: {
        ...message.metadata?.debug,
        dataSource,
      } satisfies MyUIMessageMetadata["debug"],
    } as MyUIMessageMetadata,
  } satisfies MyUIMessage;
}

type UseMessagesParams = {
  threadUuid: string | "skip";
  resumeStreamEnabled: boolean;
};

function useStreamingUiMessageChunks(threadUuid: string | "skip") {
  const isSkip = threadUuid === "skip";

  const [uiMessageChunks, setUiMessageChunks] = useState<MyUIMessageChunk[]>(
    []
  );
  const [cursor, setCursor] = useState(0);
  const streamIdRef = useRef<Id<"threadStreams"> | null>(null);

  // No cache: avoids accumulating reactive queries per cursor.
  const result = /* DO NOT MODIFY THIS HOOK -> */ useCvxQueryAuthNoCache(
    ...cvx.query
      .getThreadStreamingDelta({ threadUuid, start: cursor })
      .options.skipWhen(isSkip)
  );

  const isPending =
    result === undefined && uiMessageChunks.length === 0 && cursor === 0;

  useEffect(() => {
    if (!isSkip) return;
    streamIdRef.current = null;
    setUiMessageChunks([]);
    setCursor(0);
  }, [isSkip]);

  useEffect(() => {
    if (result === undefined) return;
    if (result === null) {
      streamIdRef.current = null;
      setUiMessageChunks([]);
      setCursor(0);
      return;
    }

    if (result.streamId !== streamIdRef.current) {
      streamIdRef.current = result.streamId;
      setUiMessageChunks([]);
      setCursor(0);
      return;
    }

    if (!result.delta) return;
    if (result.delta.chunks.length === 0) return;
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
    if (result.delta.end <= cursor) return;

    console.log("TOTO123: RECEIVED DELTA", {
      cursor,
      streamId: result.streamId,
      delta: structuredClone(result.delta),
    });

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

  const throttledMessageChunks = useFpsThrottledValue(
    isSkip ? "skip" : stream.messageChunks,
    {
      maxFps: 5,
    }
  );

  type StreamedMessageState = {
    streamId: Id<"threadStreams">;
    message: MyUIMessage;
  };

  const [streamed, setStreamed] = useState<StreamedMessageState | null>(null);
  const canBuildMessage =
    !isSkip &&
    stream.streamId !== null &&
    throttledMessageChunks !== undefined &&
    throttledMessageChunks.length > 0;

  useEffect(() => {
    if (!canBuildMessage) {
      setStreamed(null);
      return;
    }

    const streamIdAtStart = stream.streamId;
    const chunks = throttledMessageChunks;
    if (!streamIdAtStart || chunks === undefined) {
      setStreamed(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const message = await createUiMessageFromChunks<MyUIMessage>(chunks);
      if (!message) return;
      if (cancelled) return;
      if (stream.streamId !== streamIdAtStart) return;
      setStreamed({ streamId: streamIdAtStart, message });
    })();

    return () => {
      cancelled = true;
    };
  }, [canBuildMessage, stream.streamId, throttledMessageChunks]);

  const activeStreamedMessage =
    streamed?.streamId === stream.streamId ? streamed.message : undefined;

  return useMemo(
    () => ({
      messages:
        stream.isPending || activeStreamedMessage === undefined || isSkip
          ? []
          : [activeStreamedMessage],
      isPending: isSkip
        ? false
        : stream.streamId !== null &&
          (stream.isPending || activeStreamedMessage === undefined),
    }),
    [stream.isPending, activeStreamedMessage, isSkip, stream.streamId]
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

export function useMessages({
  threadUuid,
  resumeStreamEnabled,
}: UseMessagesParams) {
  const isSkip = threadUuid === "skip";

  const paginatedMessages = usePersistedMessages(threadUuid);
  const resumedMessages = useStreamingUiMessage(
    resumeStreamEnabled ? threadUuid : "skip"
  );
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
      setOptimisticPatchesArray(Array.from(optimisticPatches.current.values()));
      return patchId;
    },
    []
  );

  const revertOptimisticPatch = useCallback((patchId: PatchId) => {
    optimisticPatches.current.delete(patchId);
    setOptimisticPatchesArray(Array.from(optimisticPatches.current.values()));
  }, []);

  const cacheKey = useMemo(() => createCacheKey(threadUuid), [threadUuid]);
  const cache = useUserCacheEntryOnce<MyUIMessage[]>(cacheKey);

  const cacheLayerRaw = useMemo(
    () => normalizeMessages(cache.snapshot ?? [], { debugLabel: "cache" }),
    [cache.snapshot]
  );

  const persistedLayerRaw = useMemo(
    () =>
      normalizeMessages(paginatedMessages.results, {
        reverse: true,
        debugLabel: "persisted",
      }),
    [paginatedMessages.results]
  );

  // persisted layer might contain an optimistic shell for a pending assistant message
  // but as persisted layer has priority over cache layer, we need a way to never not
  // override a more up to date cached streaming message on refresh mid-stream while resumed stream
  // query is catching up.
  // for that reason we simply trim any last pending assistant message from the persisted layer
  // before merging it with the rest.
  const persistedLayerForMerge = useMemo(() => {
    if (!(resumeStreamEnabled && resumedMessages.isPending)) {
      return persistedLayerRaw;
    }

    const lastMessage = persistedLayerRaw.at(-1);
    if (
      lastMessage?.role === "assistant" &&
      isOngoingLiveStatus(lastMessage.metadata?.liveStatus ?? "pending")
    ) {
      // When resuming a stream, backend may emit an empty assistant shell in
      // persisted results; keep cache visible until resumed stream delivers.
      return normalizeMessages(persistedLayerRaw.slice(0, -1), {
        debugLabel: "persisted-trim",
      });
    }

    return persistedLayerRaw;
  }, [persistedLayerRaw, resumeStreamEnabled, resumedMessages.isPending]);

  // cache layer might unsync from persisted data (having in between ghost messages)
  // for that, we always remove all contiguous messages in cache layer that are within
  // the first and last message persisted (from persisted layer)
  // we do work with the persisted layer for merge because it has the last pending message trimmed
  // (so we don't remove it from the cache layer)
  // if cache layer contains [1, 2, 3, 4, 5, 6, 999, 7, 8, 9, 10]
  // and persisted layer contains [6, 7, 8, 9]
  // then the trimmed cache layer should contain [1, 2, 3, 4, 5, 10]
  // because we remove everything contiguous between persisted layer boundaries (6 and 9) included.
  const cacheLayerForMerge = useMemo(() => {
    if (persistedLayerForMerge.length === 0) return cacheLayerRaw;
    if (cacheLayerRaw.length === 0) return cacheLayerRaw;

    // get persisted layer boundaries (oldest and newest)
    // NB. (last pending message has been trimmed)
    const first = persistedLayerForMerge.at(0);
    const last = persistedLayerForMerge.at(-1);
    if (!(first && last)) return cacheLayerRaw;
    const [oldest, newest] = [first, last].sort(compareMessages) as [
      MyUIMessage,
      MyUIMessage,
    ];

    // find the index where we must start trimming the cache layer
    const oldestIndexInCache = cacheLayerRaw.findIndex(
      (msg) => msg.id === oldest.id
    );
    // skip if missed in cache layer
    if (oldestIndexInCache === -1) return cacheLayerRaw;
    // keep everything up to the oldest message index (excluded)
    const newCacheLayer: MyUIMessage[] = cacheLayerRaw.slice(
      0,
      oldestIndexInCache // excluded from the slice
    );

    // then we need to find if we have any items after the newest message index
    const newestIndexInCache = cacheLayerRaw.findIndex(
      (msg) => msg.id === newest.id
    );
    // if we do then we can add everything after the newest message index
    if (newestIndexInCache !== -1) {
      newCacheLayer.push(...cacheLayerRaw.slice(newestIndexInCache + 1));
    }

    return normalizeMessages(newCacheLayer, { debugLabel: "cache-trim" });
  }, [cacheLayerRaw, persistedLayerForMerge]);

  const optimisticLayer = useMemo(() => {
    if (optimisticPatchesArray.length === 0) {
      return normalizeMessages([], { debugLabel: "optimistic" });
    }
    const list: MyUIMessage[] = [];
    for (const patch of optimisticPatchesArray) {
      for (const msg of patch) list.push(msg);
    }
    return normalizeMessages(list, { debugLabel: "optimistic" });
  }, [optimisticPatchesArray]);

  const resumedLayer = useMemo(
    () =>
      normalizeMessages(resumedMessages.messages, {
        debugLabel: "convex-stream",
      }),
    [resumedMessages.messages]
  );

  const httpLayer = useMemo(
    () =>
      normalizeMessages(httpStreamingMessages.messages, {
        debugLabel: "http-stream",
      }),
    [httpStreamingMessages.messages]
  );

  // For performance reasons, we merge layer in two steps:
  // 1. merge the layers that rarely change
  //  - cache snapshot never changes (set at init once)
  //  - persisted layer changes only when assistant message complete (once in a while)
  //  - optimistic layer changes only when user apply/remove a patch (at send message and when complete)
  const baseMessages = useMemo(
    () =>
      mergeMessageLayers(
        [
          { messages: cacheLayerForMerge, dataSource: "cache" },
          { messages: persistedLayerForMerge, dataSource: "convex-persisted" },
          { messages: optimisticLayer, dataSource: "optimistic" },
        ],
        { sort: false } // important we want to sort only once at the end
      ),
    [cacheLayerForMerge, persistedLayerForMerge, optimisticLayer]
  );

  const baseLayer = useMemo(
    () => normalizeMessages(baseMessages),
    [baseMessages]
  );

  // 2. merge the layers that change frequently on top
  //  - resumed stream changes on every chunk received (very frequent)
  //  - http stream changes on every message received (very frequent)
  const messages = useMemo(
    () =>
      mergeMessageLayers([
        { messages: baseLayer },
        { messages: resumedLayer, dataSource: "convex-stream" },
        { messages: httpLayer, dataSource: "http-stream" },
      ]),
    [baseLayer, resumedLayer, httpLayer]
  );

  const isQueryPending = isSkip
    ? false
    : paginatedMessages.isPending || resumedMessages.isPending;
  const isPending = isSkip ? false : cache.isPending;
  const isStale = isSkip ? false : !cache.isPending && isQueryPending;
  const isLoading = isSkip ? false : paginatedMessages.isLoading;
  const paginatedStatus = paginatedMessages.status;

  useEffect(() => {
    if (isSkip) return;
    cache.set(messages.slice(-10));
  }, [isSkip, messages, cache.set]);

  return useMemo(
    () => ({
      messages,
      isPending,
      isLoading,
      isStale,
      loadMore: paginatedMessages.loadMore,
      paginatedStatus,
      streamingStatus: httpStreamingMessages.status,
      applyOptimisticPatch,
      revertOptimisticPatch,
    }),
    [
      messages,
      isPending,
      isLoading,
      isStale,
      paginatedMessages.loadMore,
      paginatedStatus,
      httpStreamingMessages.status,
      applyOptimisticPatch,
      revertOptimisticPatch,
    ]
  );
}

function compareMessages(a: MyUIMessage, b: MyUIMessage) {
  const createdAtA = a.metadata?.createdAt ?? 0;
  const createdAtB = b.metadata?.createdAt ?? 0;
  if (createdAtA !== createdAtB) return createdAtA - createdAtB;

  const updatedAtA = a.metadata?.updatedAt ?? 0;
  const updatedAtB = b.metadata?.updatedAt ?? 0;
  if (updatedAtA !== updatedAtB) return updatedAtA - updatedAtB;

  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}
