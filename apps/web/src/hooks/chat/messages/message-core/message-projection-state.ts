import type {
  MessageMetadata,
  MessagePart,
  MessageRole,
} from "./message-layer";

export type BaseMessageProjection = {
  orderedIds: readonly string[];
  indexById: ReadonlyMap<string, number>;
  roleById: ReadonlyMap<string, MessageRole>;
  partsById: ReadonlyMap<string, readonly MessagePart[]>;
  metadataById: ReadonlyMap<string, MessageMetadata>;
  orderKeyById: ReadonlyMap<string, number>;
  version: number;
};

export type HotMessageProjection = {
  addedIds: readonly string[];
  hiddenIds: ReadonlySet<string>;
  roleById: ReadonlyMap<string, MessageRole>;
  partsById: ReadonlyMap<string, readonly MessagePart[]>;
  metadataById: ReadonlyMap<string, MessageMetadata>;
  orderKeyById: ReadonlyMap<string, number>;
  version: number;
};

export type FinalMessageProjection = {
  orderedIds: readonly string[];
  version: number;
  baseVersion: number;
  hotVersion: number;
};

export function createEmptyBaseProjection(): BaseMessageProjection {
  return {
    orderedIds: [],
    indexById: new Map(),
    roleById: new Map(),
    partsById: new Map(),
    metadataById: new Map(),
    orderKeyById: new Map(),
    version: 0,
  };
}

export function createEmptyHotProjection(): HotMessageProjection {
  return {
    addedIds: [],
    hiddenIds: new Set(),
    roleById: new Map(),
    partsById: new Map(),
    metadataById: new Map(),
    orderKeyById: new Map(),
    version: 0,
  };
}

export function createEmptyFinalProjection(): FinalMessageProjection {
  return {
    orderedIds: [],
    version: 0,
    baseVersion: 0,
    hotVersion: 0,
  };
}
