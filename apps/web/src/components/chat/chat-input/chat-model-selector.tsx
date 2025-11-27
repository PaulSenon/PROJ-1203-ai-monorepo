import type { AllowedModelIds } from "@ai-monorepo/ai/model.registry";
import { useMemo, useState } from "react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Spinner } from "@/components/ui/spinner";
import {
  useModelSelectorActions,
  useModelSelectorState,
} from "@/hooks/use-user-preferences";
import { cn } from "@/lib/utils";

export function ChatModelSelector() {
  const { selectedModelId, modelsConfig, isPending } = useModelSelectorState();
  const { setSelectedModelId } = useModelSelectorActions();
  const [open, setOpen] = useState(false);

  const groupedModels = useMemo(() => {
    const groups: Record<string, AllowedModelIds[]> = {};
    for (const { id } of Object.values(modelsConfig)) {
      const provider = id.split(":")[0] ?? "other";
      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(id);
    }
    return groups;
  }, [modelsConfig]);

  const selectedLabel =
    selectedModelId != null ? modelsConfig[selectedModelId]?.label : undefined;

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs",
            "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          disabled={isPending}
          type="button"
        >
          {isPending ? (
            <Spinner />
          ) : (
            <span>{selectedLabel ?? "Select model"}</span>
          )}
        </button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {Object.entries(groupedModels).map(([provider, ids]) => (
            <ModelSelectorGroup
              heading={provider.charAt(0).toUpperCase() + provider.slice(1)}
              key={provider}
            >
              {ids.map((id) => (
                <ModelSelectorItem
                  key={id}
                  onSelect={() => {
                    setSelectedModelId(id);
                    setOpen(false);
                  }}
                  value={id}
                >
                  <ModelSelectorName>
                    {modelsConfig[id]?.label ?? id}
                  </ModelSelectorName>
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
