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
};

export type AssembleMessagesInput = {
  cache: NormalizedMessages;
  persisted: NormalizedMessages;
  optimistic: NormalizedMessages;
  resumed: NormalizedMessages;
  http: NormalizedMessages;
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
  // Keep the existing cold-vs-hot merge split so this extraction stays behavior-first.
  const baseMessages = mergeMessageLayers(
    [
      { messages: input.cache, dataSource: "cache" },
      { messages: input.persisted, dataSource: "convex-persisted" },
      { messages: input.optimistic, dataSource: "optimistic" },
    ],
    { sort: false }
  );

  return mergeMessageLayers([
    // Live overlays still win last; later slices can harden ref reuse here.
    { messages: normalizeMessages(baseMessages) },
    { messages: input.resumed, dataSource: "convex-stream" },
    { messages: input.http, dataSource: "http-stream" },
  ]);
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
    ? baseMessages.map((message) => withDataSource(message, baseLayer.dataSource))
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
        ? withDataSource(message, layer.dataSource)
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
  dataSource?: MessageDataSource
): MyUIMessage {
  // Datasource borders are dev-only debug UI; never clone on prod hot path for them.
  if (!import.meta.env.DEV) return message;
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

function compareMessages(a: MyUIMessage, b: MyUIMessage) {
  return (
    (a.metadata?.createdAt ?? Date.now()) -
    (b.metadata?.createdAt ?? Date.now())
  );
}
