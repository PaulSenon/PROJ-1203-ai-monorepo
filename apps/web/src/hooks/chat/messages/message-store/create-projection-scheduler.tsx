import type { StoreApi } from "zustand/vanilla";
import {
  computeMessageLayersStatus,
  type MessageLayerName,
  type MessageLayerSnapshot,
  type MessageLayerStatus,
  type MessageModel,
} from "../message-core/message-layer";
import { projectMessageStateAfterLayerChanges } from "../message-core/message-projection";
import type { MessageStoreState } from "./create-message-store";

export type ProjectionFlushMode = "microtask" | "frame";

export type ProjectionScheduler = {
  publishLayerSnapshot: (
    layerName: MessageLayerName,
    messages: readonly MessageModel[],
    status?: Partial<MessageLayerStatus>,
    options?: { flushMode?: ProjectionFlushMode }
  ) => void;
  clearLayer: (layerName: MessageLayerName) => void;
  flush: () => void;
  dispose: () => void;
};

export function createProjectionScheduler(
  store: StoreApi<MessageStoreState>
): ProjectionScheduler {
  const dirtyLayers = new Set<MessageLayerName>();
  let scheduled = false;
  let disposed = false;
  let frameId: number | undefined;

  function schedule(flushMode: ProjectionFlushMode) {
    if (scheduled || disposed) return;
    scheduled = true;

    if (flushMode === "frame" && typeof requestAnimationFrame === "function") {
      frameId = requestAnimationFrame(flush);
      return;
    }

    queueMicrotask(flush);
  }

  function flush() {
    if (disposed) return;

    scheduled = false;
    frameId = undefined;

    if (dirtyLayers.size === 0) return;

    const layersToProject = new Set(dirtyLayers);
    dirtyLayers.clear();

    store.setState((state) => {
      const projected = projectMessageStateAfterLayerChanges({
        layers: state.layers,
        previousBase: state.baseProjection,
        previousHot: state.hotProjection,
        previousFinal: state.finalProjection,
        dirtyLayers: layersToProject,
      });

      return {
        baseProjection: projected.baseProjection,
        hotProjection: projected.hotProjection,
        finalProjection: projected.finalProjection,
      };
    });
  }

  return {
    publishLayerSnapshot(layerName, messages, status, options) {
      if (disposed) return;

      store.setState((state) => {
        const previousLayer = state.layers[layerName];
        const nextLayer: MessageLayerSnapshot = {
          messages,
          version: previousLayer.version + 1,
          status: {
            ...previousLayer.status,
            ...status,
          },
        };
        const nextLayers = {
          ...state.layers,
          [layerName]: nextLayer,
        };

        return {
          layers: nextLayers,
          layersStatus: computeMessageLayersStatus(nextLayers),
        };
      });

      dirtyLayers.add(layerName);
      schedule(options?.flushMode ?? "microtask");
    },

    clearLayer(layerName) {
      this.publishLayerSnapshot(layerName, []);
    },

    flush,

    dispose() {
      disposed = true;
      dirtyLayers.clear();

      if (frameId !== undefined && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(frameId);
      }
    },
  };
}
