import type {
  MyUIMessage,
  MyUIMessageChunk,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import type { Id } from "@ai-monorepo/convex/convex/_generated/dataModel";
import dedent from "dedent";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cvx } from "@/lib/convex/queries";
import {
  assembleMessages,
  normalizeMessages,
} from "@/lib/message-assembly/assemble-messages";
import { planCacheTailWrite } from "@/lib/message-assembly/cache-tail";
import {
  rebuildResumedStreamMessage,
  type ResumedStreamBuildSnapshot,
} from "@/lib/message-assembly/rebuild-resumed-stream-message";
import {
  useAiSdkChatMessages,
  useAiSdkChatState,
} from "./chat/use-ai-sdk-chat";
import { useCvxQueryAuthNoCache } from "./queries/convex/utils/use-convex-query-0-auth";
import { useCvxPaginatedQueryStable } from "./queries/convex/utils/use-convex-query-1-stable";
import { useUserCacheEntryOnce } from "./use-user-cache";
import { useFpsThrottledValue } from "./utils/use-fps-throttled-state";

function isOngoingLiveStatus(liveStatus: MyUIMessageMetadata["liveStatus"]) {
  return liveStatus === "pending" || liveStatus === "streaming";
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
  const previousSnapshotRef = useRef<
    ResumedStreamBuildSnapshot<Id<"threadStreams">> | null
  >(null);

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
      previousSnapshotRef.current = null;
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
      const snapshot = await rebuildResumedStreamMessage({
        streamId: streamIdAtStart,
        chunks,
        previous: previousSnapshotRef.current,
      });
      if (!snapshot) return;
      if (cancelled) return;
      if (stream.streamId !== streamIdAtStart) return;

      previousSnapshotRef.current = snapshot;
      setStreamed((previousState) => {
        if (
          previousState?.streamId === snapshot.streamId &&
          previousState.message === snapshot.message
        ) {
          return previousState;
        }

        return snapshot;
      });
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
  const previousMessagesRef = useRef<readonly MyUIMessage[] | undefined>(
    undefined
  );
  const previousWrittenCacheTailRef = useRef<readonly MyUIMessage[] | undefined>(
    undefined
  );

  const paginatedMessages = usePersistedMessages(threadUuid);
  const resumedMessages = useStreamingUiMessage(
    resumeStreamEnabled ? threadUuid : "skip"
  );
  const httpStreamingMessages = useAiSdkChatMessages();
  const httpStreamingState = useAiSdkChatState();

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
      normalizeMessages(httpStreamingMessages, {
        debugLabel: "http-stream",
      }),
    [httpStreamingMessages]
  );

  const messages = useMemo(
    () =>
      // Keep hook-only trim/resume concerns here, then delegate canonical assembly.
      assembleMessages({
        cache: cacheLayerForMerge,
        persisted: persistedLayerForMerge,
        optimistic: optimisticLayer,
        resumed: resumedLayer,
        http: httpLayer,
        previous: previousMessagesRef.current,
        enableDebugDataSource: import.meta.env.DEV,
      }),
    [cacheLayerForMerge, persistedLayerForMerge, optimisticLayer, resumedLayer, httpLayer]
  );

  useEffect(() => {
    previousMessagesRef.current = messages;
  }, [messages]);

  // query data are pending if any query is pending
  const isQueryPending = isSkip
    ? false
    : paginatedMessages.isPending || resumedMessages.isPending;
  // data are pending is cache is pending, or if cache it empty, fallback on query pending
  const isPending = isSkip
    ? false
    : cache.isPending || (cache.isEmpty && isQueryPending);
  // data are stale if cache no longer pending and not empty while query is still pending
  const isStale = isSkip
    ? false
    : !(cache.isPending || cache.isEmpty) && isQueryPending;
  // data are loading only when data are loading (loading = subsequent load-more on paginated query)
  const isLoading = isSkip ? false : paginatedMessages.isLoading;
  const paginatedStatus = paginatedMessages.status;

  const cacheTailWritePlan = useMemo(
    () =>
      planCacheTailWrite({
        messages,
        previousTail: previousWrittenCacheTailRef.current ?? cache.snapshot ?? undefined,
      }),
    [messages, cache.snapshot]
  );

  useEffect(() => {
    if (isSkip) return;
    if (!cacheTailWritePlan.shouldWrite) return;

    // Cache only the recent tail, and only when that tail meaningfully changed.
    previousWrittenCacheTailRef.current = cacheTailWritePlan.tail;
    cache.set(cacheTailWritePlan.tail).catch((error) => {
      console.error("failed to write message cache tail", error);
    });
  }, [isSkip, cacheTailWritePlan, cache.set]);

  return useMemo(
    () => ({
      messages,
      isPending,
      isLoading,
      isStale,
      loadMore: paginatedMessages.loadMore,
      paginatedStatus,
      streamingStatus: httpStreamingState.status,
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
      httpStreamingState.status,
      applyOptimisticPatch,
      revertOptimisticPatch,
    ]
  );
}

function compareMessages(a: MyUIMessage, b: MyUIMessage) {
  return (
    (a.metadata?.createdAt ?? Date.now()) -
    (b.metadata?.createdAt ?? Date.now())
  );
}
