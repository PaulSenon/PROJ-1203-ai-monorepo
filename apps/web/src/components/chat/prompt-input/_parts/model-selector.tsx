import { defaultModelId } from "@ai-monorepo/ai/model.registry";
import { ModelSelector } from "@/components/ui-custom/chat/model-selector";
import {
  useModelSelectorActions,
  useModelSelectorState,
} from "@/hooks/use-user-preferences";

export function ChatModelSelector({
  disabled = false,
  onClose,
}: {
  disabled?: boolean;
  onClose?: () => void;
}) {
  const { selectedModelId, modelsConfig, isPending } = useModelSelectorState();
  const { setSelectedModelId } = useModelSelectorActions();

  return (
    <ModelSelector
      disabled={disabled || isPending}
      modelsConfig={modelsConfig}
      onClose={onClose}
      onSelect={setSelectedModelId}
      selectedModelId={selectedModelId ?? defaultModelId}
    />
  );
}
