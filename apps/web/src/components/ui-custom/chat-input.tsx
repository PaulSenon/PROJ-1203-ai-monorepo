import { cva } from "class-variance-authority";
import { type ComponentProps, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ModelSelector } from "./model-selector";

export function ChatInput({
  className,
  onSubmit,
  ...props
}: Omit<ComponentProps<typeof PromptInput>, "onSubmit"> & {
  onSubmit?: ComponentProps<typeof PromptInput>["onSubmit"];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");

  return (
    <PromptInputProvider>
      <PromptInput
        className={cn(className)}
        globalDrop
        inputClassName={cn(
          "h-full",
          "rounded-xl bg-background dark:border-initial dark:bg-initial",
          "bg-background/80 backdrop-blur-md",
          "border-border/50",
          "shadow-sm",
          "focus-within:border-border focus-within:bg-background/90 focus-within:shadow-lg"
        )}
        multiple
        onSubmit={(message, event) => {
          toast.success("Message sent");
          onSubmit?.(message, event);
        }}
        {...props}
      >
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
        <PromptInputBody>
          <PromptInputTextarea
            className="max-h-48 not-focus-within:max-h-16 min-h-8"
            ref={textareaRef}
            rows={1}
            submitOnEnter={!isMobile}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
              <ModelSelector
                onClose={() => {
                  textareaRef.current?.focus({ preventScroll: true });
                }}
              />
            </PromptInputActionMenu>
          </PromptInputTools>
          <PromptInputSubmit className="" status={status} variant={"ghost"} />
        </PromptInputFooter>
      </PromptInput>
    </PromptInputProvider>
  );
}

const chatInputContainerVariants = cva(
  ["relative transition-all duration-200 ease-out", "rounded-2xl border"],
  {
    variants: {
      state: {
        minimized: [
          "bg-background/80 backdrop-blur-md",
          "border-border/50",
          "shadow-sm",
        ],
        open: ["bg-background", "border-border", "shadow-lg"],
      },
    },
    defaultVariants: {
      state: "minimized",
    },
  }
);

// TODO ABSOLUTE WIP
export function ChatInputMobile({
  className,
  onSubmit,
  ...props
}: Omit<ComponentProps<typeof PromptInput>, "onSubmit"> & {
  onSubmit?: ComponentProps<typeof PromptInput>["onSubmit"];
}) {
  const [state, setState] = useState<"minimized" | "open">("minimized");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");

  return (
    <PromptInputProvider>
      <PromptInput
        className={cn(className)}
        globalDrop
        inputClassName={cn(
          "rounded-xl bg-background dark:border-initial dark:bg-initial",
          chatInputContainerVariants({ state: "open" })
        )}
        multiple
        onSubmit={(message, event) => {
          toast.success("Message sent");
          onSubmit?.(message, event);
        }}
        {...props}
      >
        <PromptInputAttachments
          className={cn(state === "minimized" && "hidden")}
        >
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
        <PromptInputBody className="flex w-full flex-row items-center px-2">
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputTextarea
            className="max-h-48 min-h-1"
            ref={textareaRef}
            rows={1}
            submitOnEnter={false}
          />
          <PromptInputSubmit className="" status={status} variant={"ghost"} />
        </PromptInputBody>
        <PromptInputFooter className="hidden">
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
              <ModelSelector />
            </PromptInputActionMenu>
          </PromptInputTools>
        </PromptInputFooter>
      </PromptInput>
    </PromptInputProvider>
  );
}
