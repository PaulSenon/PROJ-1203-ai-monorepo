import { createUiMessageFromChunks } from "@ai-monorepo/ai/libs/createUiMessageFromChunks";
import type {
  MyUIMessage,
  MyUIMessageChunk,
} from "@ai-monorepo/ai/types/uiMessage";
import type { Id } from "@ai-monorepo/convex/convex/_generated/dataModel";
import dedent from "dedent";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAiSdkChatMessages,
  useAiSdkChatState,
} from "@/hooks/chat/use-ai-sdk-chat";
import { useCvxQueryAuthNoCache } from "@/hooks/queries/convex/utils/use-convex-query-0-auth";
import { useCvxPaginatedQueryStable } from "@/hooks/queries/convex/utils/use-convex-query-1-stable";
import { useUserCacheEntryOnce } from "@/hooks/use-user-cache";
import { useFpsThrottledValue } from "@/hooks/utils/use-fps-throttled-state";
import { skipCache } from "@/lib/cache/Cache";
import { cvx } from "@/lib/convex/queries";
import {
  EMPTY_CONVERSATION_STATUS,
  type ConversationStatus,
} from "./engine/conversation-types";
import {
  normalizeMessages,
  trimCacheMessagesAgainstPersisted,
  trimPersistedMessagesForResumedStream,
} from "./conversation-message-helpers";

type ActiveConversationSourceState = {
  cacheMessages: MyUIMessage[];
  cacheSet: (messages: MyUIMessage[]) => Promise<unknown>;
  httpMessage: MyUIMessage | null;
  isLoadingOlder: boolean;
  loadOlder: ReturnType<typeof usePersistedMessages>["loadMore"];
  olderHistoryStatus: ReturnType<typeof usePersistedMessages>["status"];
  persistedMessages: MyUIMessage[];
  resumedMessage: MyUIMessage | null;
  status: ConversationStatus;
};

/**
 * Session cache key for the local recovery tail.
 */
function createCacheKey(threadUuid: string) {
  return `messages:${threadUuid}` as const;
}

function useStreamingUiMessageChunks(threadUuid: string | "skip") {
  const isSkip = threadUuid === "skip";
  const [uiMessageChunks, setUiMessageChunks] = useState<MyUIMessageChunk[]>(
    []
  );
  const [cursor, setCursor] = useState(0);
  const streamIdRef = useRef<Id<"threadStreams"> | null>(null);

  const result = useCvxQueryAuthNoCache(
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
          We passed cursor [${cursor}] but received delta starting at [${result.delta.start}].
        `,
        { cursor, result }
      );
    }
    if (result.delta.end <= cursor) return;

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
    message: MyUIMessage;
    streamId: Id<"threadStreams">;
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
      if (!message || cancelled) return;
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
      message: activeStreamedMessage ?? null,
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

/**
 * React-only source hook for the message pipeline.
 *
 * Responsibilities:
 * - read cache / Convex / AI SDK message inputs
 * - normalize and trim source layers
 * - expose source slices + low-level load status
 *
 * This hook does not merge sources into the final message view; that is the
 * runtime/reconciler job.
 */
export function useActiveConversationSourceState({
  resumeStreamEnabled,
  threadUuid,
}: {
  resumeStreamEnabled: boolean;
  threadUuid: string | "skip";
}): ActiveConversationSourceState {
  const isSkip = threadUuid === "skip";
  const paginatedMessages = usePersistedMessages(threadUuid);
  const resumedMessages = useStreamingUiMessage(
    resumeStreamEnabled ? threadUuid : "skip"
  );
  const httpStreamingMessages = useAiSdkChatMessages();
  const httpStreamingState = useAiSdkChatState();
  const cacheKey = useMemo(
    () => (isSkip ? skipCache : createCacheKey(threadUuid)),
    [isSkip, threadUuid]
  );
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

  const persistedMessages = useMemo(
    () =>
      trimPersistedMessagesForResumedStream(persistedLayerRaw, {
        isResumedMessagePending: resumedMessages.isPending,
        resumeStreamEnabled,
      }),
    [persistedLayerRaw, resumeStreamEnabled, resumedMessages.isPending]
  );

  const cacheMessages = useMemo(
    () => trimCacheMessagesAgainstPersisted(cacheLayerRaw, persistedMessages),
    [cacheLayerRaw, persistedMessages]
  );

  const httpMessage = useMemo(
    () => httpStreamingMessages.at(-1) ?? null,
    [httpStreamingMessages]
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
  const status = useMemo(
    () => ({
      ...EMPTY_CONVERSATION_STATUS,
      isPending,
      isLoading: isSkip ? false : paginatedMessages.isLoading,
      isStale,
      paginatedStatus: paginatedMessages.status,
      streamingStatus: httpStreamingState.status,
    }),
    [
      isPending,
      isSkip,
      paginatedMessages.isLoading,
      isStale,
      paginatedMessages.status,
      httpStreamingState.status,
    ]
  );

  return useMemo(
    () => ({
      cacheMessages,
      cacheSet: cache.set,
      persistedMessages,
      resumedMessage: resumedMessages.message,
      httpMessage,
      status,
      isLoadingOlder: isSkip ? false : paginatedMessages.isLoading,
      olderHistoryStatus: paginatedMessages.status,
      loadOlder: paginatedMessages.loadMore,
    }),
    [
      cacheMessages,
      cache.set,
      persistedMessages,
      resumedMessages.message,
      httpMessage,
      status,
      isSkip,
      paginatedMessages.isLoading,
      paginatedMessages.status,
      paginatedMessages.loadMore,
    ]
  );
}
