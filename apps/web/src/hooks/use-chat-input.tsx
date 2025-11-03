import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import { api } from "@ai-monorepo/convex/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import z from "zod";
import { useAuth } from "./use-auth";
import { useChatNav } from "./use-chat-nav";
import { useUserCacheEntry } from "./use-user-cache";
import { useDebouncedCallback } from "./utils/use-debounced-callback";
import { useStateSnapshotWhenReady } from "./utils/use-state-snapshot";

export function useChatInput() {
  const {
    draft,
    isPending: isPendingDraft,
    setDraft,
    delDraft,
  } = useChatDraft();
  const [input, _setInput] = useState("");

  // goal: only set input state once first when draft ready and ignore further changes
  const draftReadySnapshot = useStateSnapshotWhenReady(draft, !isPendingDraft);
  useEffect(() => {
    _setInput(draftReadySnapshot ?? "");
  }, [draftReadySnapshot]);

  // TODO
  const [selectedModelId, setSelectedModelId] =
    useState<AllowedModelIds>("openai:gpt-5-mini");

  const setInput = useCallback(
    (value: string) => {
      if (input === value) return;
      _setInput(value);
      setDraft(value);
    },
    [input, setDraft]
  );

  // TODO: a bug on clear, it clear draft but not input...
  const clear = useCallback(() => {
    _setInput("");
    delDraft();
  }, [delDraft]);

  return {
    input,
    selectedModelId,
    disabled: isPendingDraft,
    clear,
    setInput,
    setSelectedModelId,
  };
}

export function useChatDraft() {
  const { isNew, id } = useChatNav();
  const { isFullyReady } = useAuth();

  const isSkip = !isFullyReady || isNew;
  const draftFromDb = useQuery(
    api.chat.getDraft,
    isSkip
      ? "skip"
      : {
          threadUuid: id,
        }
  );
  const isPendingDb = draftFromDb === undefined;
  const setDraftDb = useMutation(api.chat.upsertDraft);
  const deleteDraftDb = useMutation(api.chat.deleteDraft);

  const {
    isPending: isPendingCache,
    data: draftFromCache,
    set: setDraftCache,
    del: delDraftCache,
  } = useUserCacheEntry("draft:new", z.string());

  const isPending = isNew ? isPendingCache : isPendingDb;
  const draft = isNew ? draftFromCache : draftFromDb?.data;

  const setDraft = useDebouncedCallback(
    (data: string) => {
      if (isNew) {
        setDraftCache(data);
      } else {
        setDraftDb({
          threadUuid: id,
          data,
        });
      }
    },
    [isNew, setDraftCache, setDraftDb, id],
    { delay: 500 }
  );

  const delDraft = useDebouncedCallback(
    () => {
      if (isNew) {
        delDraftCache();
      } else {
        deleteDraftDb({
          threadUuid: id,
        });
      }
    },
    [isNew, delDraftCache, deleteDraftDb, id],
    { delay: 500 }
  );

  return {
    draft,
    isPending,
    setDraft,
    delDraft,
  };
}
