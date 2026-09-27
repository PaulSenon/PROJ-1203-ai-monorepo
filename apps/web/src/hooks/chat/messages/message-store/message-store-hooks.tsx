import { useCallback } from "react";
import type {
  MessageMetadata,
  MessageModel,
  MessagePart,
  MessageRole,
} from "../message-core/message-layer";
import type { MessageStoreState } from "./create-message-store";
import { useMessageStore, useMessageStoreApi } from "./message-store-provider";

export function useMessageIds(): readonly string[] {
  return useMessageStore(selectMessageIds);
}

export function useMessageParts(
  id: string
): readonly MessagePart[] | undefined {
  return useMessageStore((state) => selectMessageParts(state, id));
}

export function useMessageRole(id: string): MessageRole | undefined {
  return useMessageStore((state) => selectMessageRole(state, id));
}

export function useMessageMetadata(id: string): MessageMetadata | undefined {
  return useMessageStore((state) => selectMessageMetadata(state, id));
}

export function useMessageSourcesStatus() {
  return useMessageStore((state) => state.layersStatus);
}

export function useMessageActions() {
  return useMessageStore((state) => state.actions);
}

export function useMessageSnapshotGetter() {
  const store = useMessageStoreApi();

  return useCallback(
    (id: string) => selectMessageSnapshot(store.getState(), id),
    [store]
  );
}

export function selectMessageIds(state: MessageStoreState): readonly string[] {
  return state.finalProjection.orderedIds;
}

export function selectMessageParts(
  state: MessageStoreState,
  id: string
): readonly MessagePart[] | undefined {
  return (
    state.hotProjection.partsById.get(id) ??
    state.baseProjection.partsById.get(id)
  );
}

export function selectMessageRole(
  state: MessageStoreState,
  id: string
): MessageRole | undefined {
  return (
    state.hotProjection.roleById.get(id) ??
    state.baseProjection.roleById.get(id)
  );
}

export function selectMessageMetadata(
  state: MessageStoreState,
  id: string
): MessageMetadata | undefined {
  return (
    state.hotProjection.metadataById.get(id) ??
    state.baseProjection.metadataById.get(id)
  );
}

export function selectMessageSnapshot(
  state: MessageStoreState,
  id: string
): MessageModel | undefined {
  const role = selectMessageRole(state, id);
  const parts = selectMessageParts(state, id);
  const metadata = selectMessageMetadata(state, id);

  if (!(role && parts && metadata)) return undefined;

  return {
    id,
    role,
    parts,
    metadata,
  };
}
