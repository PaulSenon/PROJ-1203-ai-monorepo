import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { describe, expect, it, vi } from "vitest";
import {
  createConversationReconciler,
  flushConversationReconcilerMicrotasks,
} from "./conversation-reconciler";
import {
  EMPTY_CONVERSATION_STATUS,
  type ViewPatch,
} from "./conversation-types";

function createMessage(
  id: string,
  role: MyUIMessage["role"] = "assistant",
  createdAt = 1,
  updatedAt = createdAt
){
  const metadata: NonNullable<MyUIMessage["metadata"]> = {
    createdAt,
    updatedAt,
    liveStatus: "completed",
    lifecycleState: "active",
  };

  const message = {
    id,
    role,
    parts: [],
    metadata,
  } satisfies MyUIMessage;

  return message;
}

function getUpsert(patch: ViewPatch, id: string) {
  const update = patch.recordUpdates?.[id];
  expect(update?.kind).toBe("upsert");
  return (update as Extract<typeof update, { kind: "upsert" }>).value;
}

describe("createConversationReconciler", () => {
  it("prefers persisted over cache for the same id", async () => {
    const applyPatch = vi.fn();
    const reconciler = createConversationReconciler({ applyPatch });
    const cached = createMessage("m1", "assistant", 1, 1);
    const persisted = createMessage("m1", "assistant", 1, 2);

    reconciler.replaceColdSource("cache", [cached]);
    reconciler.replaceColdSource("persisted", [persisted]);
    await flushConversationReconcilerMicrotasks();

    expect(applyPatch).toHaveBeenCalledTimes(1);
    expect(getUpsert(applyPatch.mock.calls[0]?.[0], "m1")).toBe(persisted);
    expect(applyPatch.mock.calls[0]?.[0].orderedIds).toEqual(["m1"]);
  });

  it("prefers hot over optimistic over persisted over cache", async () => {
    const applyPatch = vi.fn();
    const reconciler = createConversationReconciler({ applyPatch });
    const cached = createMessage("m1", "assistant", 1, 1);
    const persisted = createMessage("m1", "assistant", 1, 2);
    const optimistic = createMessage("m1", "assistant", 1, 3);
    const hot = createMessage("m1", "assistant", 1, 4);

    reconciler.replaceColdSource("cache", [cached]);
    reconciler.replaceColdSource("persisted", [persisted]);
    reconciler.applyOptimisticPatch([optimistic]);
    reconciler.replaceHotSource("http", hot);
    await flushConversationReconcilerMicrotasks();

    expect(applyPatch).toHaveBeenCalledTimes(1);
    expect(getUpsert(applyPatch.mock.calls[0]?.[0], "m1")).toBe(hot);
  });

  it("falls back when a hot source is removed", async () => {
    const applyPatch = vi.fn();
    const reconciler = createConversationReconciler({ applyPatch });
    const persisted = createMessage("m1", "assistant", 1, 2);
    const hot = createMessage("m1", "assistant", 1, 4);

    reconciler.replaceColdSource("persisted", [persisted]);
    reconciler.replaceHotSource("http", hot);
    await flushConversationReconcilerMicrotasks();

    applyPatch.mockClear();
    reconciler.replaceHotSource("http", null);
    await flushConversationReconcilerMicrotasks();

    expect(applyPatch).toHaveBeenCalledTimes(1);
    expect(getUpsert(applyPatch.mock.calls[0]?.[0], "m1")).toBe(persisted);
  });

  it("lets the latest optimistic patch win for the same id and revert cleanly", async () => {
    const applyPatch = vi.fn();
    const reconciler = createConversationReconciler({ applyPatch });
    const persisted = createMessage("m1", "assistant", 1, 1);
    const optimisticA = createMessage("m1", "assistant", 1, 2);
    const optimisticB = createMessage("m1", "assistant", 1, 3);

    reconciler.replaceColdSource("persisted", [persisted]);
    const patchIdA = reconciler.applyOptimisticPatch([optimisticA]);
    const patchIdB = reconciler.applyOptimisticPatch([optimisticB]);
    await flushConversationReconcilerMicrotasks();

    expect(getUpsert(applyPatch.mock.calls.at(-1)?.[0], "m1")).toBe(
      optimisticB
    );

    applyPatch.mockClear();
    reconciler.revertOptimisticPatch(patchIdB);
    await flushConversationReconcilerMicrotasks();
    expect(getUpsert(applyPatch.mock.calls.at(-1)?.[0], "m1")).toBe(
      optimisticA
    );

    applyPatch.mockClear();
    reconciler.revertOptimisticPatch(patchIdA);
    await flushConversationReconcilerMicrotasks();
    expect(getUpsert(applyPatch.mock.calls.at(-1)?.[0], "m1")).toBe(
      persisted
    );
  });

  it("filters deleted or archived winners from the visible patch", async () => {
    const applyPatch = vi.fn();
    const reconciler = createConversationReconciler({ applyPatch });
    const deleted = createMessage("m1", "assistant", 1, 1);
    deleted.metadata.lifecycleState = "deleted";

    reconciler.replaceColdSource("persisted", [deleted]);
    await flushConversationReconcilerMicrotasks();

    expect(applyPatch).not.toHaveBeenCalled();
  });

  it("coalesces multiple source updates into one patch per tick", async () => {
    const applyPatch = vi.fn();
    const reconciler = createConversationReconciler({ applyPatch });

    reconciler.replaceColdSource("cache", [createMessage("m1", "user", 1)]);
    reconciler.replaceColdSource("persisted", [
      createMessage("m1", "user", 1, 2),
    ]);
    reconciler.replaceStatus({
      ...EMPTY_CONVERSATION_STATUS,
      isPending: true,
    });
    await flushConversationReconcilerMicrotasks();

    expect(applyPatch).toHaveBeenCalledTimes(1);
    expect(applyPatch.mock.calls[0]?.[0].status).toEqual({
      ...EMPTY_CONVERSATION_STATUS,
      isPending: true,
    });
  });
});
