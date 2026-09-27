import type { MessageMetadata, MessageModel } from "./message-layer";

export function isVisibleMessage(message: MessageModel): boolean {
  const lifecycleState = message.metadata?.lifecycleState;
  return lifecycleState !== "deleted" && lifecycleState !== "archived";
}

export function getMessageOrderKey(message: MessageModel): number {
  return message.metadata?.createdAt ?? Date.now();
}

export function compareMessages(a: MessageModel, b: MessageModel): number {
  return getMessageOrderKey(a) - getMessageOrderKey(b);
}

export function isSortedByOrderKey(messages: readonly MessageModel[]): boolean {
  for (let index = 1; index < messages.length; index++) {
    const previous = messages[index - 1];
    const current = messages[index];
    if (!(previous && current)) continue;
    if (compareMessages(previous, current) > 0) return false;
  }
  return true;
}

export function shouldWarnOnRoleChange(
  previous: MessageModel["role"] | undefined,
  next: MessageModel["role"]
): boolean {
  return previous !== undefined && previous !== next;
}

export function reusePartsRef(
  previous: MessageModel["parts"] | undefined,
  next: MessageModel["parts"]
): MessageModel["parts"] {
  return previous === next ? previous : next;
}

export function reuseMetadataRef(
  previous: MessageMetadata | undefined,
  next: MessageMetadata
): MessageMetadata {
  return previous === next ? previous : next;
}
