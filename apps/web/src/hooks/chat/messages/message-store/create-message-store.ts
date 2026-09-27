import { createStore, type StoreApi } from "zustand/vanilla";
import {
  computeMessageLayersStatus,
  createInitialMessageLayers,
  type MessageLayerName,
  type MessageLayerStatus,
  type MessageLayers,
  type MessageLayersStatus,
  type MessageModel,
} from "../message-core/message-layer";
import {
  type BaseMessageProjection,
  createEmptyBaseProjection,
  createEmptyFinalProjection,
  createEmptyHotProjection,
  type FinalMessageProjection,
  type HotMessageProjection,
} from "../message-core/message-projection-state";
import {
  createProjectionScheduler,
  type ProjectionFlushMode,
  type ProjectionScheduler,
} from "./create-projection-scheduler";

export type MaybePromise<T> = T | Promise<T>;

export type MessageSourceName =
  | "cache"
  | "persistedPaginated"
  | "resumedStream"
  | "directStream";

export type MessageSourceStatus =
  | "idle"
  | "pending"
  | "active"
  | "error"
  | "stopped";

export type MessageSourceControl = {
  enabled: boolean;
  status: MessageSourceStatus;
  reason?: string;
  error?: unknown;
};

export type MessageSourcesState = Record<
  MessageSourceName,
  MessageSourceControl
>;

export type PublishLayerOptions = {
  flushMode?: ProjectionFlushMode;
};

export type MessageStoreActions = {
  publishLayerSnapshot: (
    layerName: MessageLayerName,
    messages: readonly MessageModel[],
    status?: Partial<MessageLayerStatus>,
    options?: PublishLayerOptions
  ) => void;
  clearLayer: (layerName: MessageLayerName) => void;
  applyOptimisticPatch: (
    messages: MessageModel | readonly MessageModel[]
  ) => string;
  revertOptimisticPatch: (patchId: string) => void;
  registerLoadMoreHandler: (handler: () => MaybePromise<void>) => () => void;
  loadMore: () => MaybePromise<void>;
  setSourceEnabled: (
    sourceName: MessageSourceName,
    enabled: boolean,
    reason?: string
  ) => void;
  setSourceStatus: (
    sourceName: MessageSourceName,
    status: MessageSourceStatus,
    error?: unknown
  ) => void;
};

export type MessageStoreState = {
  threadUuid: string;
  layers: MessageLayers;
  layersStatus: MessageLayersStatus;
  baseProjection: BaseMessageProjection;
  hotProjection: HotMessageProjection;
  finalProjection: FinalMessageProjection;
  sources: MessageSourcesState;
  actions: MessageStoreActions;
};

export type MessageStoreApi = StoreApi<MessageStoreState> & {
  disposeMessageStore?: () => void;
};

export type CreateMessageStoreConfig = {
  threadUuid: string;
  initialCacheSnapshot?: readonly MessageModel[];
};

export function createMessageStore(
  config: CreateMessageStoreConfig
): MessageStoreApi {
  let scheduler: ProjectionScheduler | undefined;
  let loadMoreHandler: (() => MaybePromise<void>) | undefined;
  const optimisticPatches = new Map<string, readonly MessageModel[]>();

  const store = createStore<MessageStoreState>()((set, get, api) => {
    scheduler = createProjectionScheduler(api as MessageStoreApi);

    const actions: MessageStoreActions = {
      publishLayerSnapshot(layerName, messages, status, options) {
        scheduler?.publishLayerSnapshot(layerName, messages, status, options);
      },

      clearLayer(layerName) {
        scheduler?.clearLayer(layerName);
      },

      applyOptimisticPatch(messages) {
        const patchId = createPatchId();
        const patchMessages = Array.isArray(messages) ? messages : [messages];
        optimisticPatches.set(patchId, patchMessages);

        scheduler?.publishLayerSnapshot(
          "optimistic",
          flattenOptimisticPatches(optimisticPatches),
          undefined,
          { flushMode: "microtask" }
        );

        return patchId;
      },

      revertOptimisticPatch(patchId) {
        optimisticPatches.delete(patchId);

        scheduler?.publishLayerSnapshot(
          "optimistic",
          flattenOptimisticPatches(optimisticPatches),
          undefined,
          { flushMode: "microtask" }
        );
      },

      registerLoadMoreHandler(handler) {
        loadMoreHandler = handler;

        return () => {
          if (loadMoreHandler === handler) {
            loadMoreHandler = undefined;
          }
        };
      },

      loadMore() {
        return loadMoreHandler?.();
      },

      setSourceEnabled(sourceName, enabled, reason) {
        set((state) => ({
          sources: {
            ...state.sources,
            [sourceName]: {
              ...state.sources[sourceName],
              enabled,
              reason,
            },
          },
        }));
      },

      setSourceStatus(sourceName, status, error) {
        set((state) => ({
          sources: {
            ...state.sources,
            [sourceName]: {
              ...state.sources[sourceName],
              status,
              error,
            },
          },
        }));
      },
    };

    const layers = createInitialMessageLayers();

    return {
      threadUuid: config.threadUuid,
      layers,
      layersStatus: computeMessageLayersStatus(layers),
      baseProjection: createEmptyBaseProjection(),
      hotProjection: createEmptyHotProjection(),
      finalProjection: createEmptyFinalProjection(),
      sources: createInitialSourcesState(),
      actions,
    };
  }) as MessageStoreApi;

  store.disposeMessageStore = () => {
    scheduler?.dispose();
  };

  if (config.initialCacheSnapshot && config.initialCacheSnapshot.length > 0) {
    store
      .getState()
      .actions.publishLayerSnapshot("cache", config.initialCacheSnapshot);
    scheduler?.flush();
  }

  return store;
}

export function createInitialSourcesState(): MessageSourcesState {
  return {
    cache: createInitialSourceControl({ enabled: true }),
    persistedPaginated: createInitialSourceControl({ enabled: true }),
    resumedStream: createInitialSourceControl({ enabled: false }),
    directStream: createInitialSourceControl({ enabled: true }),
  };
}

function createInitialSourceControl(
  input: Pick<MessageSourceControl, "enabled">
): MessageSourceControl {
  return {
    enabled: input.enabled,
    status: input.enabled ? "idle" : "stopped",
  };
}

function flattenOptimisticPatches(
  patches: ReadonlyMap<string, readonly MessageModel[]>
): readonly MessageModel[] {
  const messages: MessageModel[] = [];

  for (const patchMessages of patches.values()) {
    messages.push(...patchMessages);
  }

  return messages;
}

function createPatchId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `patch:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
