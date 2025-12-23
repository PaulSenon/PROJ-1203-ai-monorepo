import type { ComponentProps } from "react";
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
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

function ChatInputRoot({
  children,
  className,
  onSubmit,
  multiple = true,
  globalDrop = true,
  ...props
}: ComponentProps<typeof PromptInput>) {
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
          onSubmit?.(message, event);
        }}
        {...props}
      >
        {children}
      </PromptInput>
    </PromptInputProvider>
  );
}

function ChatInputAttachment({
  children,
  ...props
}: ComponentProps<typeof PromptInputAttachment>) {
  return <PromptInputAttachment {...props}>{children}</PromptInputAttachment>;
}

function ChatInputAttachments({
  children,
  ...props
}: ComponentProps<typeof PromptInputAttachments>) {
  return (
    <PromptInputAttachments {...props}>
      {(attachment) => <ChatInputAttachment data={attachment} />}
    </PromptInputAttachments>
  );
}

function ChatInputTextarea({
  children,
  className,
  rows = 1,
  ...props
}: ComponentProps<typeof PromptInputTextarea>) {
  return (
    <PromptInputTextarea
      className={cn("max-h-48 not-focus-within:max-h-16 min-h-8", className)}
      rows={rows}
      {...props}
    />
  );
}

// TODO
function ChatInputToolsMore({
  children,
  ...props
}: ComponentProps<typeof PromptInputActionMenu>) {
  return (
    <PromptInputActionMenu {...props}>
      <PromptInputActionMenuTrigger />
      <PromptInputActionMenuContent>
        <PromptInputActionAddAttachments />
      </PromptInputActionMenuContent>
    </PromptInputActionMenu>
  );
}

function ChatInputSubmitButton({
  children,
  variant = "ghost",
  ...props
}: ComponentProps<typeof PromptInputSubmit>) {
  return (
    <PromptInputSubmit variant={variant} {...props}>
      {children}
    </PromptInputSubmit>
  );
}

function ChatInputTools({
  children,
  ...props
}: ComponentProps<typeof PromptInputTools>) {
  return <PromptInputTools {...props}>{children}</PromptInputTools>;
}
function ChatInputHeader({
  children,
  ...props
}: ComponentProps<typeof PromptInputHeader>) {
  return <PromptInputHeader {...props}>{children}</PromptInputHeader>;
}
function ChatInputFooter({
  children,
  ...props
}: ComponentProps<typeof PromptInputFooter>) {
  return <PromptInputFooter {...props}>{children}</PromptInputFooter>;
}
function ChatInputBody({
  children,
  ...props
}: ComponentProps<typeof PromptInputBody>) {
  return <PromptInputBody {...props}>{children}</PromptInputBody>;
}

export const ChatInput = {
  Root: ChatInputRoot,
  Attachments: ChatInputAttachments,
  Textarea: ChatInputTextarea,
  ToolsMore: ChatInputToolsMore,
  SubmitButton: ChatInputSubmitButton,
  Tools: ChatInputTools,
  Header: ChatInputHeader,
  Footer: ChatInputFooter,
  Body: ChatInputBody,
  Attachment: ChatInputAttachment,
};
