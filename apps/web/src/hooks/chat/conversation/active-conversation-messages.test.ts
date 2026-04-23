import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_CONVERSATION_STATUS, type ViewPatch } from "./engine/conversation-types";

vi.mock("./use-active-conversation-sources", () => ({
  useActiveConversationSourceState: () => ({
    cacheMessages: [],
    cacheSet: vi.fn().mockResolvedValue(undefined),
    httpMessage: null,
    isLoadingOlder: false,
    loadOlder: vi.fn(),
    olderHistoryStatus: "Exhausted",
    persistedMessages: [],
    resumedMessage: null,
    status: {
      isLoading: false,
      isPending: false,
      isStale: false,
      paginatedStatus: "Exhausted",
      streamingStatus: "ready",
    },
  }),
}));

import {
  createActiveConversationMessageStore,
} from "./active-conversation-message-store";
import {
  createActiveConversationMessageRuntime,
} from "./active-conversation-message-runtime";

function createMessage(
  id: string,
  role: MyUIMessage["role"] = "assistant",
  lifecycleState: NonNullable<
    NonNullable<MyUIMessage["metadata"]>["lifecycleState"]
  > = "active",
  createdAt = 1,
  updatedAt = createdAt
) {
  return {
    id,
    role,
    parts: [],
    metadata: {
      createdAt,
      lifecycleState,
      liveStatus: "completed",
      updatedAt,
    },
  } satisfies MyUIMessage;
}

describe("createActiveConversationMessageStore", () => {
  it("seeds empty state by default", () => {
    const store = createActiveConversationMessageStore();
    const state = store.getState();

    expect(state.orderedIds).toEqual([]);
    expect(state.recordsById).toEqual({});
    expect(state.status).toEqual(EMPTY_CONVERSATION_STATUS);
  });

  it("preserves refs when applying an empty patch", () => {
    const store = createActiveConversationMessageStore();
    const before = store.getState();

    before.applyViewPatch({});
    const after = store.getState();

    expect(after).toBe(before);
  });

  it("updates only targeted record refs for sparse upserts", () => {
    const store = createActiveConversationMessageStore();
    const patchA: ViewPatch = {
      orderedIds: ["m1", "m2"],
      recordUpdates: {
        m1: {
          kind: "upsert",
          value: { id: "m1", role: "user", parts: [] },
        },
        m2: {
          kind: "upsert",
          value: { id: "m2", role: "assistant", parts: [] },
        },
      },
    };

    store.getState().applyViewPatch(patchA);
    const before = store.getState();

    store.getState().applyViewPatch({
      recordUpdates: {
        m2: {
          kind: "upsert",
          value: { id: "m2", role: "assistant", parts: [{ type: "text", text: "x" }] },
        },
      },
    });
    const after = store.getState();

    expect(after.orderedIds).toBe(before.orderedIds);
    expect(after.recordsById).not.toBe(before.recordsById);
    expect(after.recordsById.m1).toBe(before.recordsById.m1);
    expect(after.recordsById.m2).not.toBe(before.recordsById.m2);
  });
});

describe("createActiveConversationMessageRuntime", () => {
  it("projects source updates into the message store", async () => {
    const runtime = createActiveConversationMessageRuntime();
    const cached = createMessage("m1", "assistant", "active", 1, 1);
    const persisted = createMessage("m1", "assistant", "active", 1, 2);

    runtime.replaceCacheMessages([cached]);
    runtime.replacePersistedMessages([persisted]);
    await Promise.resolve();

    const store = runtime.getStore().getState();
    expect(store.orderedIds).toEqual(["m1"]);
    expect(store.recordsById.m1).toBe(persisted);
  });

  it("handles optimistic patches and snapshot reads without React", async () => {
    const runtime = createActiveConversationMessageRuntime();
    const optimistic = createMessage("m1", "user");

    const patchId = runtime.applyOptimisticPatch([optimistic]);
    await Promise.resolve();

    expect(runtime.getMessageSnapshot("m1")).toBe(optimistic);
    expect(runtime.getVisibleMessages()).toEqual([optimistic]);

    runtime.revertOptimisticPatch(patchId);
    await Promise.resolve();

    expect(runtime.getMessageSnapshot("m1")).toBeUndefined();
    expect(runtime.getVisibleMessages()).toEqual([]);
  });

  it("emits visible-message subscriptions only when refs actually change", async () => {
    const runtime = createActiveConversationMessageRuntime();
    const message = createMessage("m1");
    const seen: string[][] = [];

    const unsubscribe = runtime.subscribeLatestVisibleMessages((messages) => {
      seen.push(messages.map((entry) => entry.id));
    });

    runtime.replacePersistedMessages([message]);
    await Promise.resolve();
    runtime.replaceStatus({
      ...EMPTY_CONVERSATION_STATUS,
      isPending: true,
    });
    await Promise.resolve();

    expect(seen).toEqual([["m1"]]);

    unsubscribe();
  });

  it("filters deleted messages from visible snapshots", async () => {
    const runtime = createActiveConversationMessageRuntime();
    runtime.replacePersistedMessages([createMessage("m1", "assistant", "deleted")]);
    await Promise.resolve();

    expect(runtime.getVisibleMessages()).toEqual([]);
  });
});
