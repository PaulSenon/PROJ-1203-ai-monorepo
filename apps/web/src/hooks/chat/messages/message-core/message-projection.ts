import {
  BASE_MESSAGE_LAYERS,
  HOT_MESSAGE_LAYERS,
  type MessageLayerName,
  type MessageLayers,
  type MessageMetadata,
  type MessageModel,
  type MessagePart,
  type MessageRole,
} from "./message-layer";
import {
  type BaseMessageProjection,
  createEmptyBaseProjection,
  createEmptyFinalProjection,
  createEmptyHotProjection,
  type FinalMessageProjection,
  type HotMessageProjection,
} from "./message-projection-state";
import {
  getMessageOrderKey,
  isSortedByOrderKey,
  isVisibleMessage,
  shouldWarnOnRoleChange,
} from "./message-utils";

export type ProjectionInput = {
  layers: MessageLayers;
  previousBase: BaseMessageProjection;
  previousHot: HotMessageProjection;
  previousFinal: FinalMessageProjection;
  dirtyLayers: ReadonlySet<MessageLayerName>;
};

export type ProjectionOutput = {
  baseProjection: BaseMessageProjection;
  hotProjection: HotMessageProjection;
  finalProjection: FinalMessageProjection;
};

export function projectMessageStateAfterLayerChanges(
  input: ProjectionInput
): ProjectionOutput {
  const baseDirty = BASE_MESSAGE_LAYERS.some((layerName) =>
    input.dirtyLayers.has(layerName)
  );
  const hotDirty = HOT_MESSAGE_LAYERS.some((layerName) =>
    input.dirtyLayers.has(layerName)
  );

  const baseProjection = baseDirty
    ? projectBaseLayers(input.layers, input.previousBase)
    : input.previousBase;

  const hotProjection =
    baseDirty || hotDirty
      ? projectHotLayers(input.layers, baseProjection, input.previousHot)
      : input.previousHot;

  const finalProjection =
    baseDirty || hotDirty
      ? projectFinalOrder(baseProjection, hotProjection, input.previousFinal)
      : input.previousFinal;

  return {
    baseProjection,
    hotProjection,
    finalProjection,
  };
}

export function projectBaseLayers(
  layers: MessageLayers,
  previous: BaseMessageProjection = createEmptyBaseProjection()
): BaseMessageProjection {
  const list = mergeLayerMessages(
    BASE_MESSAGE_LAYERS.map((layerName) => layers[layerName].messages)
  );

  const visible = list.filter(isVisibleMessage);
  if (!isSortedByOrderKey(visible)) {
    visible.sort((a, b) => getMessageOrderKey(a) - getMessageOrderKey(b));
  }

  return buildBaseProjection(visible, previous);
}

export function projectHotLayers(
  layers: MessageLayers,
  baseProjection: BaseMessageProjection,
  previous: HotMessageProjection = createEmptyHotProjection()
): HotMessageProjection {
  const roleById = new Map<string, MessageRole>();
  const partsById = new Map<string, readonly MessagePart[]>();
  const metadataById = new Map<string, MessageMetadata>();
  const orderKeyById = new Map<string, number>();
  const addedIds: string[] = [];
  const hiddenIds = new Set<string>();

  for (const layerName of HOT_MESSAGE_LAYERS) {
    const layer = layers[layerName];
    for (const message of layer.messages) {
      if (!isVisibleMessage(message)) {
        hiddenIds.add(message.id);
        continue;
      }

      const baseRole = baseProjection.roleById.get(message.id);
      if (shouldWarnOnRoleChange(baseRole, message.role)) {
        console.warn("Message role changed across layers", {
          id: message.id,
          previous: baseRole,
          next: message.role,
          layerName,
        });
      }

      if (
        !(
          baseProjection.indexById.has(message.id) ||
          addedIds.includes(message.id)
        )
      ) {
        addedIds.push(message.id);
      }

      roleById.set(message.id, baseRole ?? message.role);
      partsById.set(message.id, message.parts);
      metadataById.set(message.id, message.metadata);
      orderKeyById.set(message.id, getMessageOrderKey(message));
    }
  }

  return {
    addedIds,
    hiddenIds,
    roleById,
    partsById,
    metadataById,
    orderKeyById,
    version: previous.version + 1,
  };
}

export function projectFinalOrder(
  baseProjection: BaseMessageProjection,
  hotProjection: HotMessageProjection,
  previous: FinalMessageProjection = createEmptyFinalProjection()
): FinalMessageProjection {
  let orderedIds = baseProjection.orderedIds;

  if (hotProjection.hiddenIds.size > 0 || hotProjection.addedIds.length > 0) {
    orderedIds = baseProjection.orderedIds.filter(
      (id) => !hotProjection.hiddenIds.has(id)
    );

    if (hotProjection.addedIds.length > 0) {
      orderedIds = [...orderedIds, ...hotProjection.addedIds].sort(
        (a, b) =>
          getFinalOrderKey(baseProjection, hotProjection, a) -
          getFinalOrderKey(baseProjection, hotProjection, b)
      );
    }
  }

  return {
    orderedIds,
    baseVersion: baseProjection.version,
    hotVersion: hotProjection.version,
    version: previous.version + 1,
  };
}

function mergeLayerMessages(
  layerMessages: readonly (readonly MessageModel[])[]
): MessageModel[] {
  const list: MessageModel[] = [];
  const indexById = new Map<string, number>();

  for (const messages of layerMessages) {
    for (const message of messages) {
      const existingIndex = indexById.get(message.id);
      if (existingIndex !== undefined) {
        list[existingIndex] = message;
        continue;
      }

      indexById.set(message.id, list.length);
      list.push(message);
    }
  }

  return list;
}

function buildBaseProjection(
  messages: MessageModel[],
  previous: BaseMessageProjection
): BaseMessageProjection {
  const orderedIds: string[] = [];
  const indexById = new Map<string, number>();
  const roleById = new Map<string, MessageRole>();
  const partsById = new Map<string, MessagePart[]>();
  const metadataById = new Map<string, MessageMetadata>();
  const orderKeyById = new Map<string, number>();

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (!message) continue;

    const previousRole = previous.roleById.get(message.id);
    if (shouldWarnOnRoleChange(previousRole, message.role)) {
      console.warn("Message role changed in base projection", {
        id: message.id,
        previous: previousRole,
        next: message.role,
      });
    }

    orderedIds.push(message.id);
    indexById.set(message.id, index);
    roleById.set(message.id, previousRole ?? message.role);
    partsById.set(message.id, message.parts);
    metadataById.set(message.id, message.metadata);
    orderKeyById.set(message.id, getMessageOrderKey(message));
  }

  return {
    orderedIds,
    indexById,
    roleById,
    partsById,
    metadataById,
    orderKeyById,
    version: previous.version + 1,
  };
}

function getFinalOrderKey(
  baseProjection: BaseMessageProjection,
  hotProjection: HotMessageProjection,
  id: string
): number {
  return (
    hotProjection.orderKeyById.get(id) ??
    baseProjection.orderKeyById.get(id) ??
    0
  );
}
