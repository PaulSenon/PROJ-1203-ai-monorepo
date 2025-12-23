import { useLayoutEffect } from "react";
import type {
  PromptInputProps,
  PromptInputSubmitProps,
} from "@/components/ai-elements/prompt-input";
import { ChatInput as Input } from "@/components/ui-custom/chat/chat-input";
import {
  useAppLoadStatus,
  useAppLoadStatusActions,
} from "@/hooks/use-app-load-status";
import { useActiveThreadActions } from "@/hooks/use-chat-active";
import { useChatInputActions, useChatInputState } from "@/hooks/use-chat-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModelSelectorState } from "@/hooks/use-user-preferences";
import { cn } from "@/lib/utils";
import { ChatModelSelector } from "./chat-model-selector";

export function ChatInput() {
  const isMobile = useIsMobile();
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

  // TODO: status not implemented yet
  const submitButtonStatus: PromptInputSubmitProps["status"] = "ready";

  return (
    <Input.Root
      className={cn("relative mt-4", !isInitialUIStateReady && "opacity-0")}
      inputClassName={cn(
        "h-full",
        "rounded-xl bg-background dark:border-initial dark:bg-initial",
        "bg-background/80 backdrop-blur-md",
        "border-border/50",
        "shadow-sm",
        "focus-within:border-border focus-within:bg-background/90 focus-within:shadow-lg"
      )}
      onSubmit={handleSubmit}
    >
      {/* <Input.Header>
        <Input.Attachments>
          {(attachment) => <Input.Attachment data={attachment} />}
        </Input.Attachments>
      </Input.Header> */}
      <Input.Body>
        <Input.Textarea
          disabled={inputState.isPending} // can type while disabled (as long as not initializing)
          onChange={(e) => inputActions.setInput(e.target.value)}
          ref={inputState.inputRef}
          submitOnEnter={!isMobile}
          value={inputState.input}
        />
      </Input.Body>
      <Input.Footer>
        <Input.Tools>
          <Input.ToolsMore />
          <ChatModelSelector onClose={() => inputActions.focus()} />
        </Input.Tools>
        <Input.SubmitButton
          disabled={inputState.disabled}
          status={submitButtonStatus}
        />
      </Input.Footer>
    </Input.Root>
  );
}
