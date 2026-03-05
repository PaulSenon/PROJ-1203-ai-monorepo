import { useDeferredValue, useEffect, useLayoutEffect, useRef } from "react";
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
import { useChatNav } from "@/hooks/use-chat-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModelSelectorState } from "@/hooks/use-user-preferences";
import { cn } from "@/lib/utils";
import { ChatModelSelector } from "./_parts/model-selector";

export function ChatInput() {
  const isMobile = useIsMobile();
  const chatNav = useChatNav();
  const { isInitialUIStateReady } = useAppLoadStatus();
  const appUiStatus = useAppLoadStatusActions();
  const inputState = useChatInputState();
  const inputActions = useChatInputActions();
  const { sendMessage } = useActiveThreadActions();
  const { selectedModelId } = useModelSelectorState();
  const activeThreadKey = chatNav.isNew ? "__new__" : chatNav.id;
  const deferredThreadKey = useDeferredValue(activeThreadKey);
  const isSwitching = activeThreadKey !== deferredThreadKey;
  const wasSwitchingRef = useRef(false);
  const isComposerDisabled = inputState.disabled || isSwitching;

  useEffect(() => {
    if (!wasSwitchingRef.current && isSwitching) {
      inputActions.clear();
    }
    wasSwitchingRef.current = isSwitching;
  }, [isSwitching, inputActions.clear]);

  const handleSubmit: PromptInputProps["onSubmit"] = (message) => {
    if (isComposerDisabled) return;
    if (!message.text || message.text.trim() === "") return;
    sendMessage({
      text: message.text,
      options: {
        selectedModelId,
      },
    });
  };

  // TODO: perhaps we need better autofocus logic
  useLayoutEffect(() => {
    appUiStatus.setInputUIReady(!isComposerDisabled);
    if (isComposerDisabled) return;
    inputActions.focus();
  }, [isComposerDisabled, inputActions.focus, appUiStatus.setInputUIReady]);

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
          disabled={isComposerDisabled}
          onChange={(e) => inputActions.setInput(e.target.value)}
          ref={inputState.inputRef}
          submitOnEnter={!isMobile}
          value={inputState.input}
        />
      </Input.Body>
      <Input.Footer>
        <Input.Tools>
          <Input.ToolsMore />
          <ChatModelSelector
            disabled={isComposerDisabled}
            onClose={() => inputActions.focus()}
          />
        </Input.Tools>
        <Input.SubmitButton
          disabled={isComposerDisabled}
          status={submitButtonStatus}
        />
      </Input.Footer>
    </Input.Root>
  );
}
