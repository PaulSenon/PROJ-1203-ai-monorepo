import {
  type AllowedModelIds,
  allowedModelIds,
} from "@ai-monorepo/ai/model.registry";
import { useActiveThreadActions } from "@/hooks/use-chat-active";
import { useChatInputActions, useChatInputState } from "@/hooks/use-chat-input";
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  type PromptInputProps,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "../ai-elements/prompt-input";

export function ChatInput() {
  const inputState = useChatInputState();
  const inputActions = useChatInputActions();
  const { sendMessage } = useActiveThreadActions();
  const handleSubmit: PromptInputProps["onSubmit"] = (message, event) => {
    if (!message.text || message.text.trim() === "") return;

    console.log("ChatInput: handleSubmit", { message, event });
    sendMessage({
      text: message.text,
      options: {
        selectedModelId: inputState.selectedModelId,
      },
    });
  };

  return (
    <PromptInput className="relative mt-4" onSubmit={handleSubmit}>
      <PromptInputHeader>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          onChange={(e) => inputActions.setInput(e.target.value)}
          ref={inputState.inputRef}
          value={inputState.input}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          {/* <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu> */}
          {/* <PromptInputSpeechButton /> */}
          {/* <PromptInputButton>
            <GlobeIcon size={16} />
            <span>Search</span>
          </PromptInputButton> */}
          <PromptInputModelSelect
            onValueChange={(value) =>
              inputActions.setSelectedModelId(value as AllowedModelIds)
            }
            value={inputState.selectedModelId}
          >
            <PromptInputModelSelectTrigger>
              <PromptInputModelSelectValue />
            </PromptInputModelSelectTrigger>
            <PromptInputModelSelectContent>
              {allowedModelIds.map((modelId) => (
                <PromptInputModelSelectItem key={modelId} value={modelId}>
                  {modelId}
                </PromptInputModelSelectItem>
              ))}
            </PromptInputModelSelectContent>
          </PromptInputModelSelect>
        </PromptInputTools>
        <PromptInputSubmit disabled={inputState.disabled} status={"ready"} />
      </PromptInputFooter>
    </PromptInput>
  );
}
