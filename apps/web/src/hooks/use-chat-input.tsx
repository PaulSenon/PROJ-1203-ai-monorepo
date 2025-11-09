import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import { api } from "@ai-monorepo/convex/convex/_generated/api";
import { useConvex, useMutation } from "convex/react";
import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import z from "zod";
import { useTsQueryInitialValue } from "./queries/tanstack/use-tanstack-query-2-initial-value";
import { useChatNav } from "./use-chat-nav";
import { useUserCacheEntry } from "./use-user-cache";
import { useSaveToClipboard } from "./utils/uas-save-to-clipboard";
import { useDebouncedCallback } from "./utils/use-debounced-callback";

// TODO draft: on new chat from click to new chat button, the draft shouldn't be restored but instead should show a hint to the user if there were a draft saved, with action to restore it

type ChatInputContextState = {
  input: string;
  selectedModelId: AllowedModelIds;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  disabled: boolean;
  isSaveDraftPending: boolean;
};

type ChatInputContextActions = {
  focus: () => void;
  saveDraft: () => void;
  clear: () => void;
  setInput: (value: string) => void;
  setSelectedModelId: (value: AllowedModelIds) => void;
};
const ChatInputStateContext = createContext<ChatInputContextState | null>(null);
const ChatInputActionsContext = createContext<ChatInputContextActions | null>(
  null
);

function _ChatInputProvider({ children }: { children: React.ReactNode }) {
  // export function useChatInput() {
  const {
    draft,
    isPending: isPendingDraft,
    setDraft,
    delDraft,
    commitSave,
    isSavePending,
  } = useChatDraft();
  const [input, _setInput] = useState("");
  const inputRef = useHotkeys<HTMLTextAreaElement>(
    ["mod+s"],
    () => {
      console.log("commitSave");
      commitSave();
    },
    [commitSave],
    {
      enableOnFormTags: ["textarea"],
      preventDefault: true,
    }
  );

  // goal: only set input state once first when draft ready and ignore further changes
  // const draftReadySnapshot = useStateSnapshotWhenReady(draft, !isPendingDraft);
  useEffect(() => {
    console.log("draft", draft);
    if (!inputRef.current) return;
    if (inputRef.current.value.length > 0) return;
    if (isPendingDraft) return;
    // TODO: we could detect when draft but already inputs not avoid override but prompt user to overwrite
    _setInput(draft ?? "");
  }, [inputRef, draft, isPendingDraft]);

  // TODO
  const [selectedModelId, setSelectedModelId] =
    useState<AllowedModelIds>("openai:gpt-5-mini");

  const setInput = useCallback(
    (value: string) => {
      // never alter input reactivity
      _setInput(value);

      // only skip draft save when no change or is already saving
      // this avoid looping back set() while del() when clear() is called
      if (input === value) return;
      if (isSavePending) return;
      setDraft(value);
    },
    [input, setDraft, isSavePending]
  );

  const clear = useCallback(() => {
    _setInput("");
    delDraft();
  }, [delDraft]);

  const focus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const state = useMemo(
    () => ({
      input,
      selectedModelId,
      inputRef,
      disabled: isPendingDraft,
      isSaveDraftPending: isSavePending,
    }),
    [input, selectedModelId, inputRef, isPendingDraft, isSavePending]
  );
  const actions = useMemo(
    () => ({
      focus,
      saveDraft: commitSave,
      clear,
      setInput,
      setSelectedModelId,
    }),
    [focus, commitSave, clear, setInput]
  );

  return (
    <ChatInputStateContext.Provider value={state}>
      <ChatInputActionsContext.Provider value={actions}>
        {children}
      </ChatInputActionsContext.Provider>
    </ChatInputStateContext.Provider>
  );
}

export function useChatInputState() {
  const context = useContext(ChatInputStateContext);
  if (!context) {
    throw new Error(
      "useChatInputState must be used within a ChatInputProvider"
    );
  }
  return context;
}

export function useChatInputActions() {
  const context = useContext(ChatInputActionsContext);
  if (!context) {
    throw new Error(
      "useChatInputActions must be used within a ChatInputProvider"
    );
  }
  return context;
}

type ChatDraftState = {
  draft: string | undefined;
  isPending: boolean;
  isSavePending: boolean;
};
type ChatDraftActions = {
  setDraft: (data: string) => Promise<void>;
  delDraft: () => Promise<void>;
  commitSave: () => Promise<void>;
};
const ChatDraftContext = createContext<
  (ChatDraftState & ChatDraftActions) | null
>(null);

function _ChatDraftProvider({ children }: { children: React.ReactNode }) {
  const convex = useConvex();
  const saveToClipboard = useSaveToClipboard();
  const { isNew, id } = useChatNav();
  const [isSavePending, setIsSavePending] = useState(false);

  // non reactive but always refreshed when id changes (no stale time)
  // TODO: review draft lifecycle since we handle snapshot at query level
  const draftFromDb = useTsQueryInitialValue({
    queryKey: ["draft", id],
    queryFn: () =>
      convex
        .query(api.chat.getDraft, { threadUuid: id })
        .then((data) => data?.data ?? null),
  });
  // ------------------------------------------------------------
  const isPendingDb = draftFromDb.isPending;
  // TODO: set/delete should mutate useTsQueryInitialValue cached data (delete)
  const setDraftDb = useMutation(api.chat.upsertDraft);
  const deleteDraftDb = useMutation(api.chat.deleteDraft);

  // TODO: create a useEmergencyMutation that replay cancelled mutation on next page load
  // useEmergencySave({
  //   key: ["draft", id].join(":"),
  //   data: {
  //     threadUuid: id,
  //     data: draftFromDb.data,
  //   },
  //   restoreCallback: (data) => {
  //     if (!data.data) return;
  //     setDraftDb({ threadUuid: data.threadUuid, data: data.data });
  //   },
  //   isInEmergencyState: () => setDraftDb,
  // });

  const {
    isPending: isPendingCache,
    data: draftFromCache,
    set: setDraftCache,
    del: delDraftCache,
  } = useUserCacheEntry("draft:new", z.string());

  const isPending = isNew ? isPendingCache : isPendingDb;
  const draft = isNew ? draftFromCache : draftFromDb.data;

  const abortController = useRef<AbortController>(new AbortController());

  const { debounced: setDraft, commit: commitSetDraft } = useDebouncedCallback(
    async (data: string) => {
      // skip if draft is already the same
      if (draft === data) return;
      console.log("saving draft", { data, isNew, id });
      setIsSavePending(true);
      try {
        if (isNew) {
          await setDraftCache(data);
        } else {
          await setDraftDb({
            threadUuid: id,
            data,
          });
        }
      } catch (error) {
        console.error(error);
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
      } finally {
        setIsSavePending(false);
      }
    },
    [isNew, setDraftCache, setDraftDb, id],
    { delay: 2000, abortController: abortController.current }
  );

  const { debounced: delDraft } = useDebouncedCallback(
    async () => {
      abortController.current.abort();
      console.log("delDraft", { isNew, id });
      try {
        if (isNew) {
          await delDraftCache();
        } else {
          if (draftFromDb === null) return;
          await deleteDraftDb({
            threadUuid: id,
          });
        }
      } catch (error) {
        console.error("Delete draft failed", error);
      }
    },
    [isNew, delDraftCache, deleteDraftDb, id, abortController],
    { delay: 2000, immediate: true }
  );

  const value = {
    draft: draft ?? undefined,
    isPending,
    isSavePending,
    setDraft,
    delDraft,
    commitSave: commitSetDraft,
  } satisfies ChatDraftState & ChatDraftActions;

  return (
    <ChatDraftContext.Provider value={value}>
      {children}
    </ChatDraftContext.Provider>
  );
}

export function useChatDraft() {
  const context = useContext(ChatDraftContext);
  if (!context) {
    throw new Error("useChatDraft must be used within a ChatDraftProvider");
  }
  return context;
}

export const ChatInputProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Important: whole input context must be keyed by chat id to rerender when chat id changes
  const chatNav = useChatNav();
  return (
    <_ChatDraftProvider key={chatNav.id}>
      <_ChatInputProvider>{children}</_ChatInputProvider>
    </_ChatDraftProvider>
  );
};
