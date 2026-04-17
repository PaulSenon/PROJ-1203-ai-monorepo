import type { MyUIMessageMetadata } from "@ai-monorepo/ai/types/uiMessage";
import type { CanonicalMessages, MessageStoreOp } from "./messages-core";

export function validateCanonicalMessagesTransition(
  previous: CanonicalMessages,
  next: CanonicalMessages
) {
  for (const id of next.order) {
    const previousMessage = previous.byId[id];
    const nextMessage = next.byId[id];
    if (!(previousMessage && nextMessage)) continue;

    if (previousMessage.role !== nextMessage.role) {
      throw new Error(
        `Role invariant violated for message ${id}: existing role changed.`
      );
    }

    validatePartsTransition(id, previousMessage.parts, nextMessage.parts);
  }
}

export function validateMessageStoreOps(
  previous: CanonicalMessages,
  next: CanonicalMessages,
  ops: MessageStoreOp[]
) {
  for (const op of ops) {
    if (op.type !== "setMessageMetadata") continue;

    const nextMessage = next.byId[op.id];
    if (!nextMessage) continue;

    if (getSourceMode(nextMessage.metadata) === "hot") {
      throw new Error(
        `Hot metadata invariant violated for message ${op.id}: hot transitions must not emit metadata ops.`
      );
    }
  }

  validateCanonicalMessagesTransition(previous, next);
}

function validatePartsTransition(
  messageId: string,
  previousParts: CanonicalMessages["byId"][string]["parts"],
  nextParts: CanonicalMessages["byId"][string]["parts"]
) {
  if (nextParts.length < previousParts.length) {
    throw new Error(
      `Append-only invariant violated for message ${messageId}: parts were removed.`
    );
  }

  const sharedLength = Math.min(previousParts.length, nextParts.length);
  if (sharedLength === 0) return;

  const nonTailLength = Math.max(0, sharedLength - 1);

  for (let index = 0; index < nonTailLength; index++) {
    const previousPart = previousParts[index];
    const nextPart = nextParts[index];
    if (!(previousPart && nextPart)) continue;

    if (previousPart.type !== nextPart.type) {
      throw new Error(
        `Part type invariant violated for message ${messageId} at index ${index}.`
      );
    }

    if (!isDeepEqual(previousPart, nextPart)) {
      throw new Error(
        `Non-tail part invariant violated for message ${messageId} at index ${index}.`
      );
    }
  }

  const previousTail = previousParts[sharedLength - 1];
  const nextTail = nextParts[sharedLength - 1];
  if (!(previousTail && nextTail)) return;

  if (previousTail.type !== nextTail.type) {
    throw new Error(
      `Part type invariant violated for message ${messageId} at tail index ${sharedLength - 1}.`
    );
  }
}

function getSourceMode(metadata: MyUIMessageMetadata | undefined) {
  const dataSource = metadata?.debug?.dataSource;
  if (dataSource === "http-stream" || dataSource === "convex-stream") {
    return "hot" as const;
  }

  return "cold" as const;
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
