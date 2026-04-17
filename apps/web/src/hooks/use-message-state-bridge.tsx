import { createUiMessageFromChunks } from "@ai-monorepo/ai/libs/createUiMessageFromChunks";
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
  compareMessages,
  mergeMessageLayers,
  normalizeMessages,
} from "@/lib/messages/messages-core";
import {
  canBuildResumedStreamedMessage,
  type ResumedStreamedMessageState,
  reconstructResumedStreamedMessage,
  selectResumedMessages,
} from "@/lib/messages/messages-resumed";
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

type UseMessageStateBridgeParams = {
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
    [isSkip, isPending, uiMessageChunks]
  );
}

type UseStreamingUiMessageReturn = {
  messages: MyUIMessage[];
  isPending: boolean;
};

function useStreamingUiMessage(
  threadUuid: string | "skip"
): UseStreamingUiMessageReturn {
  const isSkip = threadUuid === "skip";
  const stream = useStreamingUiMessageChunks(threadUuid);
  const throttledMessageChunks = useFpsThrottledValue(
    isSkip ? "skip" : stream.messageChunks,
    { maxFps: 30 }
  );

  const [streamed, setStreamed] = useState<ResumedStreamedMessageState<
    Id<"threadStreams">,
    MyUIMessage
  > | null>(null);
  const canBuildMessage = canBuildResumedStreamedMessage({
    isSkip,
    streamId: stream.streamId,
    throttledMessageChunks,
  });

  useEffect(() => {
    if (!canBuildMessage) return;
    const streamIdAtStart = stream.streamId;
    if (!streamIdAtStart || throttledMessageChunks === undefined) return;
    const chunks = throttledMessageChunks;

    let cancelled = false;

    (async () => {
      const nextStreamed = await reconstructResumedStreamedMessage({
        streamId: streamIdAtStart,
        throttledMessageChunks: chunks,
        buildMessage: (nextChunks) =>
          createUiMessageFromChunks<MyUIMessage>(nextChunks),
      });
      if (!nextStreamed) return;
      if (cancelled) return;
      if (stream.streamId !== streamIdAtStart) return;
      setStreamed(nextStreamed);
    })();

    return () => {
      cancelled = true;
    };
  }, [canBuildMessage, throttledMessageChunks, stream.streamId]);

  return useMemo(
    () =>
      selectResumedMessages({
        isSkip,
        streamId: stream.streamId,
        streamIsPending: stream.isPending,
        streamed,
      }),
    [isSkip, stream.streamId, stream.isPending, streamed]
  );
}

function createCacheKey(threadUuid: string) {
  return `thread:messages:${threadUuid}`;
}

function usePersistedMessages(threadUuid: string | "skip") {
  return useCvxPaginatedQueryStable(
    ...cvx.query
      .threadMessagesPaginated({ threadUuid })
      .options.skipWhen(threadUuid === "skip")
  );
}

export function useMessageStateBridge({
  threadUuid,
  resumeStreamEnabled,
}: UseMessageStateBridgeParams) {
  const isSkip = threadUuid === "skip";

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

  const cacheLayerForMerge = useMemo(() => {
    if (persistedLayerForMerge.length === 0) return cacheLayerRaw;
    if (cacheLayerRaw.length === 0) return cacheLayerRaw;

    const first = persistedLayerForMerge.at(0);
    const last = persistedLayerForMerge.at(-1);
    if (!(first && last)) return cacheLayerRaw;
    const [oldest, newest] = [first, last].sort(compareMessages) as [
      MyUIMessage,
      MyUIMessage,
    ];

    const oldestIndexInCache = cacheLayerRaw.findIndex(
      (msg) => msg.id === oldest.id
    );
    if (oldestIndexInCache === -1) return cacheLayerRaw;
    const newCacheLayer: MyUIMessage[] = cacheLayerRaw.slice(
      0,
      oldestIndexInCache
    );

    const newestIndexInCache = cacheLayerRaw.findIndex(
      (msg) => msg.id === newest.id
    );
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

  const baseMessages = useMemo(
    () =>
      mergeMessageLayers(
        [
          { messages: cacheLayerForMerge, dataSource: "cache" },
          { messages: persistedLayerForMerge, dataSource: "convex-persisted" },
          { messages: optimisticLayer, dataSource: "optimistic" },
        ],
        { sort: false }
      ),
    [cacheLayerForMerge, persistedLayerForMerge, optimisticLayer]
  );

  const baseLayer = useMemo(
    () => normalizeMessages(baseMessages),
    [baseMessages]
  );

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
  const isPending = isSkip
    ? false
    : cache.isPending || (cache.isEmpty && isQueryPending);
  const isStale = isSkip
    ? false
    : !(cache.isPending || cache.isEmpty) && isQueryPending;
  const isLoading = isSkip ? false : paginatedMessages.isLoading;
  const paginatedStatus = paginatedMessages.status;

  useEffect(() => {
    if (isSkip) return;
    if (messages.length === 0) return;
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
