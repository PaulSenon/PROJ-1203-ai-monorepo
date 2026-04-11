import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";

type CacheTailWritePlan = {
  tail: MyUIMessage[];
  shouldWrite: boolean;
};

type PlanCacheTailWriteInput = {
  messages: readonly MyUIMessage[];
  previousTail?: readonly MyUIMessage[];
  limit?: number;
};

const DEFAULT_CACHE_TAIL_LIMIT = 10;

export function planCacheTailWrite({
  messages,
  previousTail,
  limit = DEFAULT_CACHE_TAIL_LIMIT,
}: PlanCacheTailWriteInput): CacheTailWritePlan {
  const tail = selectCacheTail(messages, limit);
  if (tail.length === 0) {
    return {
      tail,
      shouldWrite: false,
    } satisfies CacheTailWritePlan;
  }

  return {
    tail,
    shouldWrite: !isSameCacheTail(previousTail, tail),
  } satisfies CacheTailWritePlan;
}

export function selectCacheTail(
  messages: readonly MyUIMessage[],
  limit = DEFAULT_CACHE_TAIL_LIMIT
) {
  if (messages.length <= limit) return [...messages];
  return messages.slice(-limit);
}

function isSameCacheTail(
  previous: readonly MyUIMessage[] | undefined,
  next: readonly MyUIMessage[]
) {
  if (!previous) return false;
  if (previous.length !== next.length) return false;

  return previous.every((previousMessage, index) => {
    const nextMessage = next[index];
    if (!nextMessage) return false;
    return isSameCacheMessage(previousMessage, nextMessage);
  });
}

function isSameCacheMessage(previous: MyUIMessage, next: MyUIMessage) {
  if (previous.id !== next.id) return false;
  if (previous.role !== next.role) return false;
  if (!isSameCacheMetadata(previous.metadata, next.metadata)) return false;
  return isSameCacheParts(previous.parts, next.parts);
}

function isSameCacheMetadata(
  previous: MyUIMessageMetadata | undefined,
  next: MyUIMessageMetadata | undefined
) {
  if (previous === undefined && next === undefined) return true;
  if (previous === undefined || next === undefined) return false;

  if (previous.createdAt !== next.createdAt) return false;
  if (previous.lifecycleState !== next.lifecycleState) return false;
  if (previous.liveStatus !== next.liveStatus) return false;
  if (previous.modelId !== next.modelId) return false;

  return isSameCacheError(previous.error, next.error);
}

function isSameCacheParts(
  previous: MyUIMessage["parts"],
  next: MyUIMessage["parts"]
) {
  if (previous.length !== next.length) return false;

  return previous.every((previousPart, index) => {
    const nextPart = next[index];
    if (!nextPart) return false;
    if (previousPart.type !== nextPart.type) return false;

    if (previousPart.type === "text" && nextPart.type === "text") {
      return (
        previousPart.text === nextPart.text &&
        previousPart.state === nextPart.state
      );
    }

    if (previousPart.type === "reasoning" && nextPart.type === "reasoning") {
      return (
        previousPart.text === nextPart.text &&
        previousPart.state === nextPart.state
      );
    }

    return previousPart === nextPart;
  });
}

function isSameCacheError(
  previous: MyUIMessageMetadata["error"],
  next: MyUIMessageMetadata["error"]
) {
  if (previous === undefined && next === undefined) return true;
  if (previous === undefined || next === undefined) return false;
  if (previous.kind !== next.kind) return false;
  if (previous.message !== next.message) return false;

  if (previous.kind !== "MAX_OUTPUT_TOKENS_EXCEEDED") {
    return true;
  }

  if (next.kind !== "MAX_OUTPUT_TOKENS_EXCEEDED") {
    return false;
  }

  const previousRetry = previous.params.retryWithSuggestedModelIds ?? [];
  const nextRetry = next.params.retryWithSuggestedModelIds ?? [];

  return (
    previous.params.maxOutputTokens === next.params.maxOutputTokens &&
    previousRetry.length === nextRetry.length &&
    previousRetry.every((modelId, index) => modelId === nextRetry[index])
  );
}
