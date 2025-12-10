import { defaultModelId, modelsConfig } from "@ai-monorepo/ai/model.registry";
import { CheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import {
  useModelSelectorActions,
  useModelSelectorState,
} from "@/hooks/use-user-preferences";
import { PromptInputButton } from "../ai-elements/prompt-input";

const models = Object.values(modelsConfig);

const chefs = Array.from(new Set(models.map((model) => model.chef)));

export const ModelSelector = ({ onClose }: { onClose?: () => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const { selectedModelId = defaultModelId, isPending } =
    useModelSelectorState();
  const { setSelectedModelId } = useModelSelectorActions();

  const selectedModelData = modelsConfig[selectedModelId];

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    if (!open) {
      onCloseRef.current?.();
    }
  }, [open]);

  return (
    <ModelSelectorBase onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton disabled={isPending}>
          {/* {isPending ? (
            <Spinner />
          ) : (
            <> */}
          <ModelSelectorLogo provider={selectedModelData.chef} />
          <ModelSelectorName>{selectedModelData.label}</ModelSelectorName>
          {/* </>
          )} */}
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
                      setSelectedModelId(m.id);
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
