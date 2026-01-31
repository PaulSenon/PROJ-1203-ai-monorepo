"use client";

import type { ComponentProps } from "react";
import {
  Message as AIMessage,
  MessageContent as AIMessageContent,
  MessageResponse as AIMessageResponse,
} from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

type MessageVariant = "user" | "assistant";

export type MessageRootProps = ComponentProps<typeof AIMessage>;

function MessageRoot({ className, ...props }: MessageRootProps) {
  return <AIMessage className={cn("w-full", className)} {...props} />;
}

export type MessageContentProps = ComponentProps<typeof AIMessageContent> & {
  variant?: MessageVariant;
};

const contentStyles: Record<MessageVariant, string> = {
  user: "ml-auto max-w-[90%] sm:max-w-[80%]",
  assistant: "w-full max-w-none",
};

function MessageContent({
  className,
  variant = "assistant",
  ...props
}: MessageContentProps) {
  return (
    <AIMessageContent
      className={cn(contentStyles[variant], className)}
      {...props}
    />
  );
}

export type MessageResponseProps = ComponentProps<typeof AIMessageResponse>;

function MessageResponse({ className, ...props }: MessageResponseProps) {
  return (
    <AIMessageResponse
      className={cn("[&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      {...props}
    />
  );
}

export type MessageThinkingProps = ComponentProps<"output">;

function MessageThinking({ className, ...props }: MessageThinkingProps) {
  return (
    <output
      aria-live="polite"
      className={cn(
        "flex min-h-6 items-center gap-2 text-muted-foreground text-sm",
        className
      )}
      {...props}
    >
      <Shimmer as="span" duration={1}>
        Thinking...
      </Shimmer>
    </output>
  );
}

export const Message = {
  Root: MessageRoot,
  Content: MessageContent,
  Response: MessageResponse,
  Thinking: MessageThinking,
};
