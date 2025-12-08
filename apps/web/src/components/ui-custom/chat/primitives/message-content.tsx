import type { ComponentProps } from "react";
import { MessageContent as AIMessageContent } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";

export type ChatMessageContentProps = ComponentProps<
  typeof AIMessageContent
> & {
  variant?: "user" | "assistant";
};

const variantStyles: Record<
  NonNullable<ChatMessageContentProps["variant"]>,
  string
> = {
  user: cn(
    "ml-auto max-w-[90%] sm:max-w-[80%]",
    "rounded-lg bg-secondary px-4 py-3 text-foreground shadow-sm",
    "flex flex-col gap-2"
  ),
  assistant: cn(
    "w-full max-w-none",
    "bg-transparent p-0 text-foreground",
    "flex flex-col gap-2"
  ),
};

export function ChatMessageContent({
  className,
  variant = "assistant",
  ...props
}: ChatMessageContentProps) {
  return (
    <AIMessageContent
      className={cn("text-sm", variantStyles[variant], className)}
      {...props}
    />
  );
}
