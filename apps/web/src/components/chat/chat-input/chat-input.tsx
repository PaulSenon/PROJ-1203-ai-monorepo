import { useLayoutEffect } from "react";
import {
  useAppLoadStatus,
  useAppLoadStatusActions,
} from "@/hooks/use-app-load-status";
import { useActiveThreadActions } from "@/hooks/use-chat-active";
import { useChatInputActions, useChatInputState } from "@/hooks/use-chat-input";
import { useModelSelectorState } from "@/hooks/use-user-preferences";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputProps,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "../../ai-elements/prompt-input";
import { ChatModelSelector } from "./chat-model-selector";

export function ChatInput() {
  const { isInitialUIStateReady } = useAppLoadStatus();
  const appUiStatus = useAppLoadStatusActions();
  const inputState = useChatInputState();
  const inputActions = useChatInputActions();
  const { sendMessage } = useActiveThreadActions();
  const { selectedModelId } = useModelSelectorState();
  const handleSubmit: PromptInputProps["onSubmit"] = (message, event) => {
    if (!message.text || message.text.trim() === "") return;

    console.log("ChatInput: handleSubmit", { message, event });
    sendMessage({
      text: message.text,
      options: {
        selectedModelId,
      },
    });
  };

  // TODO: perhaps we need better autofocus logic
  useLayoutEffect(() => {
    appUiStatus.setInputUIReady(!inputState.isPending);
    if (inputState.isPending) return;
    inputActions.focus();
  }, [inputState.isPending, inputActions.focus, appUiStatus.setInputUIReady]);

  return (
    // TODO: improve initial loader UI and remove this opacity thing
    <PromptInput
      className={cn("relative mt-4", !isInitialUIStateReady && "opacity-0")}
      onSubmit={handleSubmit}
    >
      <PromptInputHeader>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          disabled={inputState.isPending}
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
          <ChatModelSelector />
        </PromptInputTools>
        <PromptInputSubmit
          className="duration-0"
          disabled={inputState.disabled}
          status={"ready"}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
