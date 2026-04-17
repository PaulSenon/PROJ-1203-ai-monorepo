import type {
  MessageDataSource,
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";

declare const normalizedMessagesBrand: unique symbol;
export type NormalizedMessages = MyUIMessage[] & {
  readonly [normalizedMessagesBrand]: true;
};

export type NormalizeOptions = {
  reverse?: boolean;
  debugLabel?: string;
};

export type MessageLayer = {
  messages: NormalizedMessages;
  dataSource?: MessageDataSource;
};

export type MergeOptions = {
  sort?: boolean;
};

export type CanonicalMessage = Pick<
  MyUIMessage,
  "id" | "role" | "metadata" | "parts"
>;

export type CanonicalMessages = {
  order: string[];
  byId: Record<string, CanonicalMessage>;
};

export type MessageStoreOp =
  | { type: "upsertMessage"; message: CanonicalMessage }
  | {
      type: "setMessageMetadata";
      id: string;
      metadata: CanonicalMessage["metadata"];
    }
  | { type: "setMessageParts"; id: string; parts: CanonicalMessage["parts"] }
  | { type: "removeMessage"; id: string }
  | { type: "setOrder"; order: string[] };

const emptyNormalizedMessages: NormalizedMessages =
  [] as unknown as NormalizedMessages;

export function normalizeMessages(
  messages: MyUIMessage[] | undefined,
  options: NormalizeOptions = {}
): NormalizedMessages {
  if (!messages || messages.length === 0) return emptyNormalizedMessages;

  const normalized = options.reverse ? [...messages].reverse() : [...messages];
  warnIfNotNormalized(normalized, options.debugLabel);
  return normalized as NormalizedMessages;
}

export function warnIfNotNormalized(messages: MyUIMessage[], label?: string) {
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
        `[messages-core] ${label} not normalized (oldest -> newest).`
      );
      return;
    }
  }
}

export function mergeMessageLayers(
  layers: MessageLayer[],
  options: MergeOptions = {}
): MyUIMessage[] {
  if (layers.length === 0) return [];

  const [baseLayer, ...rest] = layers;
  const baseMessages = baseLayer?.messages ?? emptyNormalizedMessages;
  const list: MyUIMessage[] = baseLayer?.dataSource
    ? baseMessages.map((message) =>
        withDataSource(message, baseLayer.dataSource)
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

  const filtered = filterActiveMessages(list);
  if (options.sort === false || filtered.length <= 1) return filtered;
  return filtered.sort(compareMessages);
}

export function normalizeCanonicalMessages(
  messages: MyUIMessage[]
): CanonicalMessages {
  const filtered = filterActiveMessages(messages);
  const order: string[] = [];
  const byId: Record<string, CanonicalMessage> = {};

  for (const message of filtered) {
    order.push(message.id);
    byId[message.id] = {
      id: message.id,
      role: message.role,
      metadata: message.metadata,
      parts: message.parts,
    };
  }

  return { order, byId };
}

export function diffCanonicalMessages(
  prev: CanonicalMessages,
  next: CanonicalMessages,
  options: {
    debugMode: boolean;
  }
): MessageStoreOp[] {
  const ops: MessageStoreOp[] = [];

  for (const id of next.order) {
    const nextMessage = next.byId[id];
    const prevMessage = prev.byId[id];
    if (!nextMessage) continue;

    if (!prevMessage || prevMessage.role !== nextMessage.role) {
      ops.push({ type: "upsertMessage", message: nextMessage });
      continue;
    }

    const sourceMode = getSourceMode(nextMessage.metadata);

    if (sourceMode === "hot") {
      if (shouldUpdateHotParts(prevMessage.parts, nextMessage.parts)) {
        ops.push({ type: "setMessageParts", id, parts: nextMessage.parts });
      }
      continue;
    }

    if (!isNewerColdSnapshot(prevMessage.metadata, nextMessage.metadata)) {
      continue;
    }

    if (
      !areMetadataEqual(prevMessage.metadata, nextMessage.metadata, options)
    ) {
      ops.push({
        type: "setMessageMetadata",
        id,
        metadata: nextMessage.metadata,
      });
    }

    if (shouldUpdateColdParts(prevMessage.parts, nextMessage.parts)) {
      ops.push({ type: "setMessageParts", id, parts: nextMessage.parts });
    }
  }

  for (const id of prev.order) {
    if (next.byId[id]) continue;
    ops.push({ type: "removeMessage", id });
  }

  if (!isStringArrayEqual(prev.order, next.order)) {
    ops.push({ type: "setOrder", order: next.order });
  }

  return ops;
}

function getSourceMode(metadata: MyUIMessageMetadata | undefined) {
  const dataSource = metadata?.debug?.dataSource;
  if (dataSource === "http-stream" || dataSource === "convex-stream") {
    return "hot" as const;
  }

  return "cold" as const;
}

function isNewerColdSnapshot(
  previous: MyUIMessageMetadata | undefined,
  next: MyUIMessageMetadata | undefined
) {
  return (next?.updatedAt ?? 0) > (previous?.updatedAt ?? 0);
}

function shouldUpdateColdParts(
  previous: MyUIMessage["parts"],
  next: MyUIMessage["parts"]
) {
  return !isDeepEqual(previous, next);
}

function shouldUpdateHotParts(
  previous: MyUIMessage["parts"],
  next: MyUIMessage["parts"]
) {
  if (previous === next) return false;

  const previousLength = previous.length;
  const nextLength = next.length;

  if (previousLength !== nextLength) {
    return true;
  }

  if (previousLength === 0) {
    return false;
  }

  return !isDeepEqual(previous[previousLength - 1], next[nextLength - 1]);
}

export function compareMessages(a: MyUIMessage, b: MyUIMessage) {
  return (
    (a.metadata?.createdAt ?? Date.now()) -
    (b.metadata?.createdAt ?? Date.now())
  );
}

function filterActiveMessages(messages: MyUIMessage[]) {
  return messages.filter(
    (message) =>
      message.metadata?.lifecycleState !== "deleted" &&
      message.metadata?.lifecycleState !== "archived"
  );
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

function areMetadataEqual(
  previous: MyUIMessageMetadata | undefined,
  next: MyUIMessageMetadata | undefined,
  options: { debugMode: boolean }
) {
  if (previous === next) return true;
  if (previous === undefined || next === undefined) {
    return previous === next;
  }

  if (previous.modelId !== next.modelId) return false;
  if (previous.updatedAt !== next.updatedAt) return false;
  if (previous.createdAt !== next.createdAt) return false;
  if (previous.liveStatus !== next.liveStatus) return false;
  if (previous.lifecycleState !== next.lifecycleState) return false;
  if (!isDeepEqual(previous.error, next.error)) return false;
  if (!isDeepEqual(previous.timing, next.timing)) return false;
  if (!isDeepEqual(previous.usage, next.usage)) return false;
  if (options.debugMode && !isDeepEqual(previous.debug, next.debug))
    return false;

  return true;
}

function isStringArrayEqual(previous: string[], next: string[]) {
  if (previous === next) return true;
  if (previous.length !== next.length) return false;

  for (let i = 0; i < previous.length; i++) {
    if (previous[i] !== next[i]) return false;
  }

  return true;
}

function isDeepEqual(previous: unknown, next: unknown): boolean {
  if (Object.is(previous, next)) return true;
  if (typeof previous !== typeof next) return false;
  if (previous === null || next === null) return previous === next;

  if (Array.isArray(previous)) {
    if (!Array.isArray(next)) return false;
    if (previous.length !== next.length) return false;

    for (let i = 0; i < previous.length; i++) {
      if (!isDeepEqual(previous[i], next[i])) return false;
    }

    return true;
  }

  if (typeof previous !== "object" || typeof next !== "object") {
    return Object.is(previous, next);
  }

  const previousRecord = previous as Record<string, unknown>;
  const nextRecord = next as Record<string, unknown>;
  const previousKeys = Object.keys(previousRecord);
  const nextKeys = Object.keys(nextRecord);

  if (previousKeys.length !== nextKeys.length) return false;

  for (const key of previousKeys) {
    if (!(key in nextRecord)) return false;
    if (!isDeepEqual(previousRecord[key], nextRecord[key])) return false;
  }

  return true;
}
