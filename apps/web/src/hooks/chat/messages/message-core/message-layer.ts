import type {
  MyUIMessage,
  MyUIMessageMetadata,
  MyUIMessagePart,
} from "@ai-monorepo/ai/types/uiMessage";

export type MessageModel = MyUIMessage;
export type MessageMetadata = MyUIMessageMetadata | undefined;
export type MessagePart = MyUIMessagePart;
export type MessageRole = MyUIMessage["role"];

export const BASE_MESSAGE_LAYERS = [
  "cache",
  "persisted",
  "optimistic",
] as const;

export const HOT_MESSAGE_LAYERS = ["resumedStream", "directStream"] as const;

export type BaseMessageLayerName = (typeof BASE_MESSAGE_LAYERS)[number];
export type HotMessageLayerName = (typeof HOT_MESSAGE_LAYERS)[number];
export type MessageLayerName = BaseMessageLayerName | HotMessageLayerName;

export type MessageLayerStatus = {
  pending: boolean;
  stale: boolean;
  loading: boolean;
  paginatedStatus?: string;
};

export type MessageLayerSnapshot = {
  messages: readonly MyUIMessage[];
  version: number;
  status: MessageLayerStatus;
};

export type MessageLayers = Record<MessageLayerName, MessageLayerSnapshot>;

export type MessageLayersStatus = {
  isPending: boolean;
  isStale: boolean;
  isLoading: boolean;
  paginatedStatus?: string;
};

export function createEmptyLayerSnapshot(): MessageLayerSnapshot {
  return {
    messages: [],
    version: 0,
    status: {
      pending: false,
      stale: false,
      loading: false,
    },
  };
}

export function createInitialMessageLayers(): MessageLayers {
  return {
    cache: createEmptyLayerSnapshot(),
    persisted: createEmptyLayerSnapshot(),
    optimistic: createEmptyLayerSnapshot(),
    resumedStream: createEmptyLayerSnapshot(),
    directStream: createEmptyLayerSnapshot(),
  };
}

export function computeMessageLayersStatus(
  layers: MessageLayers
): MessageLayersStatus {
  return {
    isPending: Object.values(layers).some((layer) => layer.status.pending),
    isStale: Object.values(layers).some((layer) => layer.status.stale),
    isLoading: Object.values(layers).some((layer) => layer.status.loading),
    paginatedStatus: layers.persisted.status.paginatedStatus,
  };
}

export function isBaseMessageLayer(
  layerName: MessageLayerName
): layerName is BaseMessageLayerName {
  return (BASE_MESSAGE_LAYERS as readonly string[]).includes(layerName);
}

export function isHotMessageLayer(
  layerName: MessageLayerName
): layerName is HotMessageLayerName {
  return (HOT_MESSAGE_LAYERS as readonly string[]).includes(layerName);
}
