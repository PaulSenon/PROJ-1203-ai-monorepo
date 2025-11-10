import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useChatDraftActions, useChatDraftState } from "./use-chat-draft";

// TODO draft: on new chat from click to new chat button, the draft shouldn't be restored but instead should show a hint to the user if there were a draft saved, with action to restore it

type ChatInputContextState = {
  input: string;
  selectedModelId: AllowedModelIds;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  disabled: boolean;
  isPending: boolean;
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

export function ChatInputProvider({ children }: { children: React.ReactNode }) {
  const draftState = useChatDraftState();

  const draftActions = useChatDraftActions();
  const [input, _setInput] = useState("");
  const inputRef = useHotkeys<HTMLTextAreaElement>(
    ["mod+s"],
    () => {
      console.log("commitSave");
      draftActions.commitSave();
    },
    [draftActions.commitSave],
    {
      enableOnFormTags: ["textarea"],
      preventDefault: true,
    }
  );

  // goal: only set input state once first when draft ready and ignore further changes
  useEffect(() => {
    console.log("draft", {
      draft: draftState.draft,
      status: draftState.status,
    });
    if (!draftState.draft) return;
    if (!inputRef.current) return;
    if (inputRef.current.value === draftState.draft) return;
    if (draftState.status === "fresh" && inputRef.current.value.length > 0) {
      console.warn(
        "draft received but input not empty. Ignoring draft for now..."
      );
      return;
    }
    _setInput(draftState.draft);
  }, [inputRef, draftState.draft, draftState.status]);

  // TODO
  const [selectedModelId, setSelectedModelId] =
    useState<AllowedModelIds>("openai:gpt-5-mini");

  const setInput = useCallback(
    (value: string) => {
      // never alter input reactivity
      _setInput(value);

      // only skip draft save when no change
      // this avoid looping back set() while del() when clear() is called
      if (input === value) return;
      draftActions.setDraft(value);
    },
    [input, draftActions.setDraft]
  );

  const clear = useCallback(() => {
    _setInput("");
    draftActions.delDraft();
  }, [draftActions.delDraft]);

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
      isPending: draftState.status !== "fresh",
      disabled: draftState.status !== "fresh",
    }),
    [input, selectedModelId, inputRef, draftState.status]
  ) satisfies ChatInputContextState;

  const actions = useMemo(
    () => ({
      focus,
      saveDraft: draftActions.commitSave,
      clear,
      setInput,
      setSelectedModelId,
    }),
    [focus, draftActions.commitSave, clear, setInput]
  ) satisfies ChatInputContextActions;

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
