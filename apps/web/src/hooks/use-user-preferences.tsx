import {
  type AllowedModelIds,
  isAllowedModelId,
  type LanguageModelConfig,
  modelsConfig,
} from "@ai-monorepo/ai/model.registry";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useChatSessionScope } from "@/components/providers/4-chat-session-scope";
import type { Prettify } from "@/lib/utils";
import { useThread } from "./queries/use-chat-active-queries";
import { useUserPreferencesQuery } from "./queries/use-user-preferences-queries";

type ModelSelectorState = {
  selectedModelId?: AllowedModelIds;
  isPending: boolean;
  modelsConfig: Prettify<LanguageModelConfig<AllowedModelIds>>;
};

type ModelSelectorActions = {
  setSelectedModelId: (modelId: AllowedModelIds) => void;
};
const ModelSelectorStateContext = createContext<ModelSelectorState | null>(
  null
);
const ModelSelectorActionsContext = createContext<ModelSelectorActions | null>(
  null
);

export function ModelSelectorProvider({ children }: { children: ReactNode }) {
  const { isNew, sessionId } = useChatSessionScope();
  const [selectedModelId, setSelectedModelId] = useState<
    AllowedModelIds | undefined
  >(undefined);

  // always pick from user preferences
  const userPreferences = useUserPreferencesQuery();
  useEffect(() => {
    console.log("userPreferences", userPreferences);
  }, [userPreferences]);

  // if not new pick from thread config
  const thread = useThread(isNew ? "skip" : sessionId);

  const isPending = isNew ? userPreferences.isPending : thread.isPending;

  /**
   * Model to pick logic:
   * - for existing threads we simply use the last used one for this thread
   * - for new threads we either pick the preferred one or the last used one in any thread.
   *     => depending on the user preference
   *     => default to last used
   * TODO: when user setting page, add options to change this behavior.
   *       => cannot switch to "preferred" mode yet (unless manual DB edit)
   */
  const modelToPickForNewThread =
    userPreferences.data?.modelToPickForNewThread ?? "lastUsed";
  useEffect(() => {
    if (selectedModelId) return;
    const selectedModelIdFromDb = (() => {
      if (!isNew) return thread.data?.lastUsedModelId;
      if (modelToPickForNewThread === "preferred")
        return userPreferences.data?.preferredModelId;
      if (modelToPickForNewThread === "lastUsed")
        return userPreferences.data?.lastUsedModelId;
      return;
    })();

    if (isAllowedModelId(selectedModelIdFromDb))
      setSelectedModelId(selectedModelIdFromDb);
  }, [
    isNew,
    modelToPickForNewThread,
    thread.data,
    userPreferences.data,
    selectedModelId,
  ]);

  const state = useMemo(
    () => ({
      isPending,
      selectedModelId,
      modelsConfig,
    }),
    [isPending, selectedModelId]
  );

  const actions = useMemo(
    () => ({
      setSelectedModelId,
    }),
    []
  );

  return (
    <ModelSelectorStateContext.Provider value={state}>
      <ModelSelectorActionsContext.Provider value={actions}>
        {children}
      </ModelSelectorActionsContext.Provider>
    </ModelSelectorStateContext.Provider>
  );
}

export function useModelSelectorState() {
  const state = useContext(ModelSelectorStateContext);
  if (!state) {
    throw new Error(
      "useModelSelectorState must be used within ModelSelectorProvider"
    );
  }
  return state;
}

export function useModelSelectorActions() {
  const actions = useContext(ModelSelectorActionsContext);
  if (!actions) {
    throw new Error(
      "useModelSelectorActions must be used within ModelSelectorProvider"
    );
  }
  return actions;
}
