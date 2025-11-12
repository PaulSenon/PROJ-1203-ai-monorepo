import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import {
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
} from "@/components/ai-elements/prompt-input";
import { Spinner } from "@/components/ui/spinner";
import {
  useModelSelectorActions,
  useModelSelectorState,
} from "@/hooks/use-user-preferences";

export function ChatModelSelector() {
  const { selectedModelId, modelsConfig, isPending } = useModelSelectorState();
  const { setSelectedModelId } = useModelSelectorActions();

  return (
    <PromptInputModelSelect
      disabled={isPending}
      onValueChange={(value) => setSelectedModelId(value as AllowedModelIds)}
      value={selectedModelId}
    >
      <PromptInputModelSelectTrigger>
        {isPending ? <Spinner /> : <PromptInputModelSelectValue />}
      </PromptInputModelSelectTrigger>
      <PromptInputModelSelectContent>
        {Object.values(modelsConfig).map(({ id, label }) => (
          <PromptInputModelSelectItem key={id} value={id}>
            {label}
          </PromptInputModelSelectItem>
        ))}
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
}
