import type {
  MyUIMessage,
  MyUIMessageMetadata,
  MyUIMessagePart,
} from "@ai-monorepo/ai/types/uiMessage";
import type { Observable, ObservablePrimitive } from "@legendapp/state";
import { batch, observable, observablePrimitive } from "@legendapp/state";
import type {
  CanonicalMessage,
  CanonicalMessages,
  MessageStoreOp,
} from "./messages-core";

type StoreMessagePart = { type: string };
type StoreMessageParts = StoreMessagePart[];

type RoleLeaf = Pick<
  Observable<CanonicalMessage["role"]>,
  "get" | "peek" | "set"
>;
type MetadataLeaf = ObservablePrimitive<MyUIMessageMetadata | undefined>;
type PartsLeaf = ObservablePrimitive<StoreMessageParts>;

export type MessageNode = {
  id: string;
  role$: RoleLeaf;
  metadata$: MetadataLeaf;
  parts$: PartsLeaf;
};

function createMessageNode(message: CanonicalMessage): MessageNode {
  return {
    id: message.id,
    role$: observable(message.role),
    metadata$: observablePrimitive<MyUIMessageMetadata | undefined>(
      message.metadata
    ),
    parts$: observablePrimitive<StoreMessageParts>(
      toStoredParts(message.parts)
    ),
  };
}

export type MessagesStore = {
  orderedIds$: Observable<string[]>;
  messagesById: Map<string, MessageNode>;
};

export function createMessagesStore(initial: CanonicalMessages): MessagesStore {
  const messagesById = new Map<string, MessageNode>();

  for (const id of initial.order) {
    const message = initial.byId[id];
    if (!message) continue;
    messagesById.set(id, createMessageNode(message));
  }

  return {
    orderedIds$: observable(initial.order),
    messagesById,
  };
}

export function applyMessageStoreOps(
  store: MessagesStore,
  ops: MessageStoreOp[]
) {
  batch(() => {
    for (const op of ops) {
      switch (op.type) {
        case "upsertMessage": {
          const existing = store.messagesById.get(op.message.id);
          if (existing) {
            existing.role$.set(op.message.role);
            existing.metadata$.set(op.message.metadata);
            existing.parts$.set(toStoredParts(op.message.parts));
            break;
          }

          store.messagesById.set(op.message.id, createMessageNode(op.message));
          break;
        }

        case "setMessageMetadata": {
          const existing = store.messagesById.get(op.id);
          if (!existing) {
            throw new Error(`Missing message node for id: ${op.id}`);
          }

          existing.metadata$.set(op.metadata);
          break;
        }

        case "setMessageParts": {
          const existing = store.messagesById.get(op.id);
          if (!existing) {
            throw new Error(`Missing message node for id: ${op.id}`);
          }

          existing.parts$.set(toStoredParts(op.parts));
          break;
        }

        case "removeMessage": {
          store.messagesById.delete(op.id);
          break;
        }

        case "setOrder": {
          store.orderedIds$.set(op.order);
          break;
        }

        default: {
          throw new Error(
            `Unsupported message store op: ${JSON.stringify(op)}`
          );
        }
      }
    }
  });
}

function toStoredParts(parts: MyUIMessage["parts"]): StoreMessageParts {
  return parts as StoreMessageParts;
}

export function fromStoredParts(parts: StoreMessageParts): MyUIMessagePart[] {
  return parts as MyUIMessagePart[];
}
