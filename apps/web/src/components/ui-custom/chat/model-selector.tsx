import type {
  AllowedModelIds,
  LanguageModelConfig,
  // modelsConfig,
} from "@ai-monorepo/ai/model.registry";
import { CheckIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { PromptInputButton } from "../../ai-elements/prompt-input";

export const ModelSelector = ({
  onSelect,
  modelsConfig,
  selectedModelId,
  disabled,
  onClose,
}: {
  selectedModelId: AllowedModelIds;
  modelsConfig: LanguageModelConfig<AllowedModelIds>;
  onSelect?: (modelId: AllowedModelIds) => void;
  onClose?: () => void;
  disabled?: boolean;
}) => {
  // internal state
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  // derived input values
  const selectedModelData = modelsConfig[selectedModelId];
  const models = useMemo(() => Object.values(modelsConfig), [modelsConfig]);
  const chefs = useMemo(
    () => Array.from(new Set(models.map((model) => model.chef))),
    [models]
  );

  return (
    <ModelSelectorBase onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton disabled={disabled}>
          <ModelSelectorLogo provider={selectedModelData.chef} />
          <ModelSelectorName>{selectedModelData.label}</ModelSelectorName>
        </PromptInputButton>
      </ModelSelectorTrigger>
      <ModelSelectorContent
        onCloseAutoFocus={(e) => {
          // important to disable focus back on trigger on close (so we can restore focus on textarea)
          e.preventDefault();
        }}
      >
        <ModelSelectorInput
          autoComplete="off"
          autoCorrect="off"
          inputMode="search"
          placeholder="Search models..."
          ref={inputRef}
          spellCheck="false"
        />
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
                      onSelect?.(m.id);
                      setOpen(false);
                      onClose?.();
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
                    {selectedModelId === m.id ? (
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
