import { defaultModelId } from "@ai-monorepo/ai/model.registry";
import { ModelSelector } from "@/components/ui-custom/chat/model-selector";
import {
  useModelSelectorActions,
  useModelSelectorState,
} from "@/hooks/use-user-preferences";

export function ChatModelSelector({ onClose }: { onClose?: () => void }) {
  const { selectedModelId, modelsConfig, isPending } = useModelSelectorState();
  const { setSelectedModelId } = useModelSelectorActions();

  return (
    <ModelSelector
      disabled={isPending}
      modelsConfig={modelsConfig}
      onClose={onClose}
      onSelect={setSelectedModelId}
      selectedModelId={selectedModelId ?? defaultModelId}
    />
  );
}
