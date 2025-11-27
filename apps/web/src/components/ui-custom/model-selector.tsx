import {
  type AllowedModelIds,
  defaultModelId,
  modelsConfig,
} from "@ai-monorepo/ai/model.registry";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import {
  ModelSelector as ModelSelectorBase,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { PromptInputButton } from "../ai-elements/prompt-input";

const models = Object.values(modelsConfig);

const chefs = Array.from(new Set(models.map((model) => model.chef)));

export const ModelSelector = () => {
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] =
    useState<AllowedModelIds>(defaultModelId);

  const selectedModelData = modelsConfig[selectedModel];

  return (
    <ModelSelectorBase onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton>
          <ModelSelectorLogo provider={selectedModelData.chef} />
          <ModelSelectorName>{selectedModelData.label}</ModelSelectorName>
        </PromptInputButton>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {chefs.map((chef) => (
            <ModelSelectorGroup heading={chef} key={chef}>
              {models
                .filter((m) => m.chef === chef)
                .map((m) => (
                  <ModelSelectorItem
                    key={m.id}
                    onSelect={() => {
                      setSelectedModel(m.id);
                      setOpen(false);
                    }}
                    value={m.id}
                  >
                    <ModelSelectorLogo provider={m.chef} />
                    <ModelSelectorName>{m.label}</ModelSelectorName>
                    <ModelSelectorLogoGroup>
                      {m.providers.map((provider) => (
                        <ModelSelectorLogo key={provider} provider={provider} />
                      ))}
                    </ModelSelectorLogoGroup>
                    {selectedModel === m.id ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelectorBase>
  );
};
