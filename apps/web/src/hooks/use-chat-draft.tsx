import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import z from "zod";
import { cvx } from "@/lib/convex/queries";
import type { MaybePromise } from "@/lib/utils";
import { useCvxQueryCached } from "./queries/convex/utils/use-convex-query-2-cached";
import { ChatNavRerenderTrigger, useChatNav } from "./use-chat-nav";
import { useUserCacheEntry } from "./use-user-cache";
import { useSaveToClipboard } from "./utils/uas-save-to-clipboard";
import { useDebouncedCallback } from "./utils/use-debounced-callback";

function useNewChatDraft({ skip = false }: { skip?: boolean }) {
  const { isPending, data, set, del } = useUserCacheEntry(
    "draft:new",
    z.string()
  );

  const result = useMemo(
    () => ({
      isPending,
      draft: data,
      setDraft: set,
      delDraft: del,
    }),
    [isPending, data, set, del]
  );

  const skipResult = useMemo(
    () => ({
      isPending: true,
      draft: undefined,
      setDraft: () => {
        throw new Error("Can't set draft when skipping");
      },
      delDraft: () => {
        throw new Error("Can't delete draft when skipping");
      },
    }),
    []
  ) satisfies typeof result;

  return skip ? skipResult : result;
}

function useExistingChatDraft(args: { threadUuid: string; skip?: boolean }) {
  const isSkip = args.skip ?? false;

  const { data, isPending, isStale } = useCvxQueryCached(
    ...cvx.query
      .getDraft({ threadUuid: args.threadUuid })
      .options.skipWhen(isSkip)
  );

  const set = cvx.mutations.draft.upsert();
  const del = cvx.mutations.draft.delete();

  const result = useMemo(
    () => ({
      isPending,
      isStale,
      draft: data?.data,
      setDraft: set,
      delDraft: del,
    }),
    [isPending, isStale, data, set, del]
  );

  const skipResult = useMemo(
    () => ({
      isPending: true,
      isStale: false,
      draft: undefined,
      setDraft: () => {
        throw new Error("Can't set draft when skipping");
      },
      delDraft: () => {
        throw new Error("Can't delete draft when skipping");
      },
    }),
    []
  );

  return isSkip ? skipResult : result;
}

type DraftState = {
  draft: string | null | undefined;
  status: "pending" | "stale" | "fresh";
  saveStatus: "initial" | "scheduled" | "saving" | "saved" | "error";
  deleteStatus: "initial" | "scheduled" | "deleting" | "deleted" | "error";
};
type DraftActions = {
  setDraft: (data: string) => MaybePromise<void>;
  delDraft: () => MaybePromise<void>;
  commitSave: () => MaybePromise<void>;
};

const DraftStateContext = createContext<DraftState | null>(null);
const DraftActionsContext = createContext<DraftActions | null>(null);

export function useChatDraftState() {
  const state = useContext(DraftStateContext);
  if (!state) {
    throw new Error("useDraftState must be used within DraftProvider");
  }
  return state;
}

export function useChatDraftActions() {
  const actions = useContext(DraftActionsContext);
  if (!actions) {
    throw new Error("useDraftActions must be used within DraftProvider");
  }
  return actions;
}

function INTERNAL_DraftProvider({ children }: { children: React.ReactNode }) {
  const { isNew, id } = useChatNav();

  const saveToClipboard = useSaveToClipboard();
  const [saveStatus, setSaveStatus] =
    useState<DraftState["saveStatus"]>("initial");
  const [deleteStatus, setDeleteStatus] =
    useState<DraftState["deleteStatus"]>("initial");

  const newChatDraft = useNewChatDraft({
    skip: !isNew,
  });
  const existingChatDraft = useExistingChatDraft({
    threadUuid: id,
    skip: isNew,
  });

  const draft = isNew ? newChatDraft.draft : existingChatDraft.draft;
  const isPending = isNew
    ? newChatDraft.isPending
    : existingChatDraft.isPending;
  const isStale = isNew ? false : existingChatDraft.isStale;

  // create new abort controller on nav change
  // biome-ignore lint/correctness/useExhaustiveDependencies: read above
  const abortController = useMemo(() => new AbortController(), [id]);

  const { debounced: setDraftDebounced, commit: commitSetDraft } =
    useDebouncedCallback(
      async (data: string) => {
        // skip if draft is already the same
        if (draft === data) return;
        // console.log("saving draft", { id, data, isNew });
        // setSaveStatus("saving");
        try {
          if (isNew) {
            await newChatDraft.setDraft(data);
          } else {
            await existingChatDraft.setDraft({
              threadUuid: id,
              data,
            });
          }
          setSaveStatus("saved");
          console.log("draft saved", { id, data, isNew });
        } catch (error) {
          setSaveStatus("error");
          console.error("Save draft failed", { id, error, data, isNew });
          const { success } = await saveToClipboard(data);
          if (success) {
            toast.error(
              "Failed to save draft, it has been saved to your clipboard"
            );
          } else {
            toast.error(
              "Failed to save draft, and failed to save to clipboard. You might want to copy it manually to avoid losing your work"
            );
          }
        }
      },
      [isNew, newChatDraft.setDraft, existingChatDraft.setDraft, id],
      { delay: 2000, abortController }
    );

  const { debounced: delDraftDebounced } = useDebouncedCallback(
    async () => {
      setDeleteStatus("deleting");
      abortController.abort();
      console.log("delDraft", { id, isNew });
      try {
        if (isNew) {
          await newChatDraft.delDraft();
        } else {
          if (existingChatDraft.draft === null) return;
          await existingChatDraft.delDraft({
            threadUuid: id,
          });
        }
        setDeleteStatus("deleted");
        console.log("draft deleted", { id, isNew });
      } catch (error) {
        setDeleteStatus("error");
        console.error("Delete draft failed", { id, error, isNew });
      }
    },
    [
      isNew,
      existingChatDraft.delDraft,
      existingChatDraft.draft,
      newChatDraft.delDraft,
      id,
      abortController,
    ],
    { delay: 2000, immediate: true }
  );

  const setDraft = useCallback(
    (data: string) => {
      setSaveStatus("scheduled");
      // console.log("setDraft scheduled", { id, data, isNew });
      return setDraftDebounced(data);
    },
    [setDraftDebounced]
  );

  const delDraft = useCallback(() => {
    setDeleteStatus("scheduled");
    // console.log("delDraft scheduled", { id, isNew });
    return delDraftDebounced();
  }, [delDraftDebounced]);

  const status: DraftState["status"] = useMemo(() => {
    if (isPending) return "pending";
    if (isStale) return "stale";
    return "fresh";
  }, [isStale, isPending]);

  const state = useMemo(
    () => ({
      status,
      saveStatus,
      deleteStatus,
      draft,
    }),
    [status, saveStatus, deleteStatus, draft]
  ) satisfies DraftState;

  const actions = useMemo(
    () => ({
      setDraft,
      delDraft,
      commitSave: commitSetDraft,
    }),
    [commitSetDraft, setDraft, delDraft]
  ) satisfies DraftActions;

  useEffect(() => {
    console.log("draft status changed", { status, id });
  }, [status, id]);

  return (
    <DraftActionsContext.Provider value={actions}>
      <DraftStateContext.Provider value={state}>
        {children}
      </DraftStateContext.Provider>
    </DraftActionsContext.Provider>
  );
}

// TODO: perhaps there is a better way to handle this
export function ChatDraftProvider({ children }: { children: React.ReactNode }) {
  const Outlet = useCallback(
    () => <INTERNAL_DraftProvider>{children}</INTERNAL_DraftProvider>,
    [children]
  );
  return <ChatNavRerenderTrigger Outlet={Outlet} />;
}
