import { useLayoutEffect } from "react";
import type {
  PromptInputProps,
  PromptInputSubmitProps,
} from "@/components/ai-elements/prompt-input";
import { ChatInput as Input } from "@/components/ui-custom/chat/chat-input";
import { useAppReadyState } from "@/hooks/chat/app-ready/app-ready-visibility";
import { useActiveThreadActions } from "@/hooks/use-chat-active";
import { useChatInputActions, useChatInputState } from "@/hooks/use-chat-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModelSelectorState } from "@/hooks/use-user-preferences";
import { cn } from "@/lib/utils";
import { ChatModelSelector } from "./_parts/model-selector";

export function ChatInput() {
  const isMobile = useIsMobile();
  const inputState = useChatInputState();
  const inputActions = useChatInputActions();
  const { sendMessage } = useActiveThreadActions();
  const { hidden: isSwitching } = useAppReadyState("conversation");
  // const { markReady } = useAppReadySignalAction({checkpoint: 'prompt-input-data', runKey: })
  const { selectedModelId } = useModelSelectorState();
  const isInputPending = inputState.isPending;
  const isInputDisabled = inputState.disabled || isSwitching;
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

  // TODO(app-ready): connect input visibility/focus policy to app-ready phases later.
  useLayoutEffect(() => {
    if (isInputPending) return;
    inputActions.focus();
  }, [isInputPending, inputActions.focus]);

  // useEffect(() => {}, [markReady]);

  // TODO: status not implemented yet
  const submitButtonStatus: PromptInputSubmitProps["status"] = "ready";

  return (
    <Input.Root
      className={cn("relative mt-4", isSwitching && "pointer-events-none")}
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
          disabled={isInputPending}
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
            disabled={isSwitching}
            onClose={() => inputActions.focus()}
          />
        </Input.Tools>
        <Input.SubmitButton
          disabled={isInputDisabled}
          status={submitButtonStatus}
        />
      </Input.Footer>
    </Input.Root>
  );
}
