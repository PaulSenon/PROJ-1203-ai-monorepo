import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";

/**
 * Canonical message record shape stored in the hot message store.
 */
export type MessageRecord = MyUIMessage;

/**
 * Non-message loading/streaming status mirrored alongside the message view.
 *
 * This is metadata about the message pipeline, not the messages themselves.
 */
export type ConversationStatus = {
  isLoading: boolean;
  isPending: boolean;
  isStale: boolean;
  paginatedStatus: string;
  streamingStatus: string;
};

/**
 * Full state held by the hot message store.
 */
export type ConversationViewState = {
  orderedIds: string[];
  recordsById: Record<string, MessageRecord>;
  status: ConversationStatus;
};

/**
 * Sparse patch emitted by the reconciler and applied by the message store.
 */
export type ViewPatch = {
  orderedIds?: string[];
  recordUpdates?: Record<
    string,
    | {
        kind: "remove";
      }
    | {
        kind: "upsert";
        value: MessageRecord;
      }
  >;
  status?: ConversationStatus;
};

/**
 * Source layers whose whole list is replaced when they update.
 */
export type ColdSourceName = "cache" | "persisted";
/**
 * Source layers represented by at most one currently visible in-flight message.
 */
export type HotSourceName = "http" | "resumed";

/**
 * Neutral status used before any source has published data.
 */
export const EMPTY_CONVERSATION_STATUS: ConversationStatus = {
  isLoading: false,
  isPending: false,
  isStale: false,
  paginatedStatus: "Exhausted",
  streamingStatus: "ready",
};
