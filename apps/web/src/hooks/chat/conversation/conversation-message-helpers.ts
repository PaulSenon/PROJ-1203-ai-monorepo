import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";

declare const normalizedMessagesBrand: unique symbol;
/**
 * Brand used to document "oldest -> newest" ordering expectations across the
 * message-source pipeline.
 */
export type NormalizedMessages = MyUIMessage[] & {
  readonly [normalizedMessagesBrand]: true;
};

type NormalizeOptions = {
  debugLabel?: string;
  reverse?: boolean;
};

const emptyNormalizedMessages: NormalizedMessages =
  [] as unknown as NormalizedMessages;

/**
 * Marks message arrays as normalized and warns in dev if ordering looks wrong.
 *
 * All source merging assumes oldest -> newest ordering.
 */
export function normalizeMessages(
  messages: MyUIMessage[] | undefined,
  options: NormalizeOptions = {}
): NormalizedMessages {
  if (!messages || messages.length === 0) return emptyNormalizedMessages;
  const normalized = options.reverse ? [...messages].reverse() : messages;
  warnIfNotNormalized(normalized, options.debugLabel);
  return normalized as NormalizedMessages;
}

/**
 * Removes the trailing persisted optimistic assistant shell while a resumed
 * stream is still catching up.
 */
export function trimPersistedMessagesForResumedStream(
  persistedMessages: NormalizedMessages,
  options: {
    isResumedMessagePending: boolean;
    resumeStreamEnabled: boolean;
  }
): NormalizedMessages {
  if (!(options.resumeStreamEnabled && options.isResumedMessagePending)) {
    return persistedMessages;
  }

  const lastMessage = persistedMessages.at(-1);
  if (
    lastMessage?.role === "assistant" &&
    isOngoingLiveStatus(lastMessage.metadata?.liveStatus ?? "pending")
  ) {
    return normalizeMessages(persistedMessages.slice(0, -1), {
      debugLabel: "persisted-trim",
    });
  }

  return persistedMessages;
}

/**
 * Trims cache overlap against persisted history so stale cached middle ranges do
 * not survive once authoritative persisted history arrives.
 */
export function trimCacheMessagesAgainstPersisted(
  cacheMessages: NormalizedMessages,
  persistedMessages: NormalizedMessages
): NormalizedMessages {
  if (persistedMessages.length === 0 || cacheMessages.length === 0) {
    return cacheMessages;
  }

  const first = persistedMessages.at(0);
  const last = persistedMessages.at(-1);
  if (!(first && last)) return cacheMessages;
  const [oldest, newest] = [first, last].sort(compareMessages) as [
    MyUIMessage,
    MyUIMessage,
  ];

  const oldestIndexInCache = cacheMessages.findIndex(
    (message) => message.id === oldest.id
  );
  if (oldestIndexInCache === -1) return cacheMessages;

  const trimmedCache: MyUIMessage[] = cacheMessages.slice(0, oldestIndexInCache);
  const newestIndexInCache = cacheMessages.findIndex(
    (message) => message.id === newest.id
  );

  if (newestIndexInCache !== -1) {
    trimmedCache.push(...cacheMessages.slice(newestIndexInCache + 1));
  }

  return normalizeMessages(trimmedCache, { debugLabel: "cache-trim" });
}

/**
 * Reads only the visible tail used for local recovery cache persistence.
 */
export function getLatestVisibleMessages(
  orderedIds: string[],
  recordsById: Record<string, MyUIMessage | undefined>,
  limit = 10
) {
  return orderedIds
    .slice(-limit)
    .map((messageId) => recordsById[messageId])
    .filter((message): message is MyUIMessage => message !== undefined);
}

/**
 * Cheap ref-equality guard used to avoid redundant cache writes.
 */
export function hasSameMessageReferenceList(
  previousMessages: MyUIMessage[],
  nextMessages: MyUIMessage[]
) {
  if (previousMessages.length !== nextMessages.length) return false;

  for (let index = 0; index < previousMessages.length; index += 1) {
    if (previousMessages[index] !== nextMessages[index]) {
      return false;
    }
  }

  return true;
}

function warnIfNotNormalized(messages: MyUIMessage[], label?: string) {
  if (!import.meta.env.DEV) return;
  if (!label) return;
  if (messages.length < 2) return;

  const sampleCount = Math.min(messages.length - 1, 3);
  for (let index = 0; index < sampleCount; index += 1) {
    const prev = messages[index];
    const next = messages[index + 1];
    if (!(prev && next)) continue;
    if ((prev.metadata?.createdAt ?? 0) <= (next.metadata?.createdAt ?? 0)) {
      continue;
    }
    console.warn(
      `[conversation-message-helpers] ${label} not normalized (oldest -> newest).`
    );
    return;
  }
}

function compareMessages(a: MyUIMessage, b: MyUIMessage) {
  return (
    (a.metadata?.createdAt ?? Date.now()) -
    (b.metadata?.createdAt ?? Date.now())
  );
}

function isOngoingLiveStatus(liveStatus: MyUIMessageMetadata["liveStatus"]) {
  return liveStatus === "pending" || liveStatus === "streaming";
}
