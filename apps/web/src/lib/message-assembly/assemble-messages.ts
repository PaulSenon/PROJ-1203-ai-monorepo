import type {
  MessageDataSource,
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";

declare const normalizedMessagesBrand: unique symbol;

export type NormalizedMessages = MyUIMessage[] & {
  readonly [normalizedMessagesBrand]: true;
};

type NormalizeOptions = {
  reverse?: boolean;
  debugLabel?: string;
};

type MessageLayer = {
  messages: NormalizedMessages;
  dataSource?: MessageDataSource;
};

type MergeOptions = {
  sort?: boolean;
  enableDebugDataSource?: boolean;
};

export type AssembleMessagesInput = {
  cache: NormalizedMessages;
  persisted: NormalizedMessages;
  optimistic: NormalizedMessages;
  resumed: NormalizedMessages;
  http: NormalizedMessages;
  previous?: readonly MyUIMessage[];
  enableDebugDataSource?: boolean;
};

const emptyNormalizedMessages: NormalizedMessages =
  [] as unknown as NormalizedMessages;

export function normalizeMessages(
  messages: MyUIMessage[] | undefined,
  options: NormalizeOptions = {}
): NormalizedMessages {
  if (!messages || messages.length === 0) return emptyNormalizedMessages;

  const normalized = options.reverse ? [...messages].reverse() : messages;
  warnIfNotNormalized(normalized, options.debugLabel);
  return normalized as NormalizedMessages;
}

export function assembleMessages(input: AssembleMessagesInput): MyUIMessage[] {
  const enableDebugDataSource = input.enableDebugDataSource ?? false;

  // Keep the existing cold-vs-hot merge split so this extraction stays behavior-first.
  const baseMessages = mergeMessageLayers(
    [
      { messages: input.cache, dataSource: "cache" },
      { messages: input.persisted, dataSource: "convex-persisted" },
      { messages: input.optimistic, dataSource: "optimistic" },
    ],
    { sort: false, enableDebugDataSource }
  );

  const mergedMessages = mergeMessageLayers([
    // Live overlays still win last; later slices can harden ref reuse here.
    { messages: normalizeMessages(baseMessages) },
    { messages: input.resumed, dataSource: "convex-stream" },
    { messages: input.http, dataSource: "http-stream" },
  ], { enableDebugDataSource });

  return stabilizeMessages(input.previous, mergedMessages, {
    enableDebugDataSource,
  });
}

export function stabilizeMessages(
  previous: readonly MyUIMessage[] | undefined,
  next: readonly MyUIMessage[],
  options: StabilizeOptions
): MyUIMessage[] {
  if (!previous || previous.length === 0 || next.length === 0) {
    return [...next];
  }

  const previousById = new Map(previous.map((message) => [message.id, message]));
  const stabilized = next.map((message) =>
    stabilizeMessage(previousById.get(message.id), message, options)
  );

  if (
    previous.length === stabilized.length &&
    stabilized.every((message, index) => message === previous[index])
  ) {
    return [...previous];
  }

  return stabilized;
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

function mergeMessageLayers(
  layers: MessageLayer[],
  options: MergeOptions = {}
): MyUIMessage[] {
  if (layers.length === 0) return [];

  const [baseLayer, ...rest] = layers;
  const baseMessages = baseLayer?.messages ?? emptyNormalizedMessages;
  const list: MyUIMessage[] = baseLayer?.dataSource
    ? baseMessages.map((message) =>
        withDataSource(
          message,
          baseLayer.dataSource,
          options.enableDebugDataSource ?? false
        )
      )
    : [...baseMessages];
  const indexMap = new Map<string, number>();

  for (let i = 0; i < list.length; i++) {
    const message = list[i];
    if (!message) continue;
    indexMap.set(message.id, i);
  }

  for (const layer of rest) {
    if (layer.messages.length === 0) continue;

    for (const message of layer.messages) {
      const nextMessage = layer.dataSource
        ? withDataSource(
            message,
            layer.dataSource,
            options.enableDebugDataSource ?? false
          )
        : message;
      const existingIndex = indexMap.get(nextMessage.id);

      if (existingIndex !== undefined) {
        list[existingIndex] = nextMessage;
        continue;
      }

      const newIndex = list.push(nextMessage) - 1;
      indexMap.set(nextMessage.id, newIndex);
    }
  }

  const filtered = list.filter(
    (message) =>
      message.metadata?.lifecycleState !== "deleted" &&
      message.metadata?.lifecycleState !== "archived"
  );

  if (options.sort === false || filtered.length <= 1) return filtered;
  return filtered.sort(compareMessages);
}

function withDataSource(
  message: MyUIMessage,
  dataSource: MessageDataSource | undefined,
  enableDebugDataSource: boolean
): MyUIMessage {
  // Datasource borders are dev-only debug UI; never clone on prod hot path for them.
  if (!enableDebugDataSource) return message;
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

export type StabilizeOptions = {
  enableDebugDataSource: boolean;
};

function stabilizeMessage(
  previous: MyUIMessage | undefined,
  next: MyUIMessage,
  options: StabilizeOptions
): MyUIMessage {
  if (!previous) return next;
  if (previous.id !== next.id) return next;
  if (previous.role !== next.role) return next;

  const metadata = stabilizeMetadata(previous.metadata, next.metadata, options);
  const parts = stabilizeParts(previous.parts, next.parts);

  if (metadata === previous.metadata && parts === previous.parts) {
    return previous;
  }

  if (metadata === next.metadata && parts === next.parts) {
    return next;
  }

  return {
    ...next,
    metadata,
    parts,
  } satisfies MyUIMessage;
}

function stabilizeMetadata(
  previous: MyUIMessageMetadata | undefined,
  next: MyUIMessageMetadata | undefined,
  options: StabilizeOptions
): MyUIMessageMetadata | undefined {
  if (previous === undefined || next === undefined) return next;

  if (previous.createdAt !== next.createdAt) return next;
  if (previous.liveStatus !== next.liveStatus) return next;
  if (previous.modelId !== next.modelId) return next;

  if (!isSameError(previous.error, next.error)) return next;

  if (
    options.enableDebugDataSource &&
    previous.debug?.dataSource !== next.debug?.dataSource
  ) {
    return next;
  }

  return previous;
}

function stabilizeParts(
  previous: MyUIMessage["parts"],
  next: MyUIMessage["parts"]
): MyUIMessage["parts"] {
  const comparableLength = Math.min(previous.length, next.length);

  let reusedAll = previous.length === next.length;
  let reusedSome = false;
  const stabilizedParts = next.map((part, index) => {
    const previousPart = index < comparableLength ? previous[index] : undefined;
    const stabilizedPart = stabilizePart(previousPart, part);

    if (stabilizedPart === previousPart) {
      reusedSome = true;
    } else {
      reusedAll = false;
    }

    return stabilizedPart;
  });

  if (reusedAll) return previous;
  if (reusedSome) return stabilizedParts;
  return next;
}

function stabilizePart(
  previous: MyUIMessage["parts"][number] | undefined,
  next: MyUIMessage["parts"][number]
): MyUIMessage["parts"][number] {
  if (!previous) return next;
  if (previous.type !== next.type) return next;

  if (previous.type === "text" && next.type === "text") {
    if (previous.text === next.text && previous.state === next.state) {
      return previous;
    }
    return next;
  }

  if (previous.type === "reasoning" && next.type === "reasoning") {
    if (previous.text === next.text && previous.state === next.state) {
      return previous;
    }
    return next;
  }

  return next;
}

function isSameError(
  previous: MyUIMessageMetadata["error"],
  next: MyUIMessageMetadata["error"]
) {
  if (previous === undefined && next === undefined) return true;
  if (previous === undefined || next === undefined) return false;
  if (previous.kind !== next.kind) return false;
  if (previous.message !== next.message) return false;

  if (previous.kind === "MAX_OUTPUT_TOKENS_EXCEEDED") {
    if (next.kind !== "MAX_OUTPUT_TOKENS_EXCEEDED") return false;

    const previousRetry = previous.params.retryWithSuggestedModelIds ?? [];
    const nextRetry = next.params.retryWithSuggestedModelIds ?? [];

    return (
      previous.params.maxOutputTokens === next.params.maxOutputTokens &&
      previousRetry.length === nextRetry.length &&
      previousRetry.every((modelId, index) => modelId === nextRetry[index])
    );
  }

  return true;
}

function compareMessages(a: MyUIMessage, b: MyUIMessage) {
  return (
    (a.metadata?.createdAt ?? Date.now()) -
    (b.metadata?.createdAt ?? Date.now())
  );
}
