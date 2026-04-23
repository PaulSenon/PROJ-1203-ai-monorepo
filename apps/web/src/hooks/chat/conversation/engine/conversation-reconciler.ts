import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  EMPTY_CONVERSATION_STATUS,
  type ColdSourceName,
  type ConversationStatus,
  type ConversationViewState,
  type HotSourceName,
  type MessageRecord,
  type ViewPatch,
} from "./conversation-types";

type OptimisticPatchId = string;

type ConversationReconcilerState = {
  destroyed: boolean;
  flushScheduled: boolean;
  lastView: ConversationViewState;
  optimisticOrder: OptimisticPatchId[];
  sources: {
    cold: Record<ColdSourceName, MyUIMessage[]>;
    hot: Record<HotSourceName, MyUIMessage | null>;
    optimistic: Map<OptimisticPatchId, MyUIMessage[]>;
  };
  status: ConversationStatus;
};

type CreateConversationReconcilerOptions = {
  applyPatch: (patch: ViewPatch) => void;
};

/**
 * Pure merge engine for message sources.
 *
 * Responsibilities:
 * - maintain source precedence
 * - coalesce updates per microtask
 * - emit sparse patches for the hot message store
 *
 * It knows nothing about React, AI SDK, Convex, or provider state.
 */
export type ConversationReconciler = {
  applyOptimisticPatch: (
    messages: MyUIMessage[] | MyUIMessage
  ) => OptimisticPatchId;
  destroy: () => void;
  replaceColdSource: (source: ColdSourceName, messages: MyUIMessage[]) => void;
  replaceHotSource: (
    source: HotSourceName,
    message: MyUIMessage | null
  ) => void;
  replaceStatus: (status: ConversationStatus) => void;
  revertOptimisticPatch: (patchId: OptimisticPatchId) => void;
};

/**
 * Test helper to let queued reconciler microtasks flush deterministically.
 */
export function flushConversationReconcilerMicrotasks() {
  return Promise.resolve();
}

/**
 * Creates the pure reconciler used by the message runtime.
 *
 * Source precedence:
 * hot > optimistic > persisted > cache
 */
export function createConversationReconciler({
  applyPatch,
}: CreateConversationReconcilerOptions): ConversationReconciler {
  const state: ConversationReconcilerState = {
    destroyed: false,
    flushScheduled: false,
    lastView: {
      orderedIds: [],
      recordsById: {},
      status: EMPTY_CONVERSATION_STATUS,
    },
    optimisticOrder: [],
    sources: {
      cold: {
        cache: [],
        persisted: [],
      },
      hot: {
        http: null,
        resumed: null,
      },
      optimistic: new Map(),
    },
    status: EMPTY_CONVERSATION_STATUS,
  };

  const scheduleFlush = () => {
    if (state.destroyed || state.flushScheduled) return;
    state.flushScheduled = true;
    queueMicrotask(() => {
      state.flushScheduled = false;
      if (state.destroyed) return;

      const nextView = buildConversationView(state);
      const patch = buildViewPatch(state.lastView, nextView);
      state.lastView = nextView;

      if (!patch) return;
      applyPatch(patch);
    });
  };

  return {
    replaceColdSource(source, messages) {
      state.sources.cold[source] = messages;
      scheduleFlush();
    },
    replaceHotSource(source, message) {
      state.sources.hot[source] = message;
      scheduleFlush();
    },
    replaceStatus(status) {
      state.status = status;
      scheduleFlush();
    },
    applyOptimisticPatch(messages) {
      const patchId = crypto.randomUUID();
      const normalizedMessages = Array.isArray(messages) ? messages : [messages];
      state.optimisticOrder.push(patchId);
      state.sources.optimistic.set(patchId, normalizedMessages);
      scheduleFlush();
      return patchId;
    },
    revertOptimisticPatch(patchId) {
      state.optimisticOrder = state.optimisticOrder.filter((id) => id !== patchId);
      state.sources.optimistic.delete(patchId);
      scheduleFlush();
    },
    destroy() {
      state.destroyed = true;
      state.flushScheduled = false;
    },
  };
}

function buildConversationView(
  state: ConversationReconcilerState
): ConversationViewState {
  const winnersById = new Map<string, MyUIMessage>();

  for (const message of state.sources.cold.cache) {
    winnersById.set(message.id, message);
  }

  for (const message of state.sources.cold.persisted) {
    winnersById.set(message.id, message);
  }

  for (const patchId of state.optimisticOrder) {
    const messages = state.sources.optimistic.get(patchId);
    if (!messages) continue;
    for (const message of messages) {
      winnersById.set(message.id, message);
    }
  }

  const hotResumed = state.sources.hot.resumed;
  if (hotResumed) {
    winnersById.set(hotResumed.id, hotResumed);
  }

  const hotHttp = state.sources.hot.http;
  if (hotHttp) {
    winnersById.set(hotHttp.id, hotHttp);
  }

  const orderedMessages = dedupeByIdPreservingOrder([
    ...state.sources.cold.cache,
    ...state.sources.cold.persisted,
    ...state.optimisticOrder.flatMap(
      (patchId) => state.sources.optimistic.get(patchId) ?? []
    ),
    ...[hotResumed].filter(isNonNullable),
    ...[hotHttp].filter(isNonNullable),
  ])
    .map((message) => winnersById.get(message.id))
    .filter(isVisibleWinner);

  return {
    orderedIds: orderedMessages.map((message) => message.id),
    recordsById: Object.fromEntries(
      orderedMessages.map((message) => [message.id, message as MessageRecord])
    ) as Record<string, MessageRecord>,
    status: state.status,
  };
}

function buildViewPatch(
  prev: ConversationViewState,
  next: ConversationViewState
): ViewPatch | null {
  const didOrderedIdsChange =
    prev.orderedIds.length !== next.orderedIds.length ||
    prev.orderedIds.some((messageId, index) => messageId !== next.orderedIds[index]);
  const didStatusChange = prev.status !== next.status;

  let recordUpdates: ViewPatch["recordUpdates"];
  const nextIds = new Set(next.orderedIds);

  for (const messageId of prev.orderedIds) {
    if (nextIds.has(messageId)) continue;
    recordUpdates ??= {};
    recordUpdates[messageId] = { kind: "remove" };
  }

  for (const messageId of next.orderedIds) {
    if (prev.recordsById[messageId] === next.recordsById[messageId]) continue;
    recordUpdates ??= {};
    recordUpdates[messageId] = {
      kind: "upsert",
      value: next.recordsById[messageId]!,
    };
  }

  if (!(didOrderedIdsChange || didStatusChange || recordUpdates)) {
    return null;
  }

  return {
    orderedIds: didOrderedIdsChange ? next.orderedIds : undefined,
    recordUpdates,
    status: didStatusChange ? next.status : undefined,
  };
}

function isVisibleWinner(
  message: MyUIMessage | undefined
): message is MyUIMessage {
  if (!message) return false;
  const lifecycleState = message.metadata?.lifecycleState;
  return lifecycleState !== "archived" && lifecycleState !== "deleted";
}

function dedupeByIdPreservingOrder(messages: MyUIMessage[]) {
  const seen = new Set<string>();
  const deduped: MyUIMessage[] = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) continue;
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    deduped.push(message);
  }

  return deduped.reverse();
}

function isNonNullable<T>(value: T | null | undefined): value is T {
  return value != null;
}
