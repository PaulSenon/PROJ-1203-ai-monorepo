"use client";

/**
 * L2 Message Compound Component
 *
 * Wraps L1 ai-elements primitives with app styling. This is app-agnostic.
 *
 * For other L2 message pieces, import directly:
 * - ThinkingBlock from "./thinking-block"
 * - ChatStatusMessage from "./message-status"
 * - ChatMessageFooter from "./message-footer"
 * - ChatMessageActions/Action from "./message-actions" / "./message-action"
 * - ChatMessageInfos/Info from "./message-infos" / "./message-info"
 * - ChatMessageContent from "./message-content"
 *
 * L3 Adapter (chat/chat-message.tsx) maps MyUIMessage → these components.
 */

import type { ComponentProps } from "react";
import { memo } from "react";
import {
  Message as AIMessage,
  MessageAction as AIMessageAction,
  MessageActions as AIMessageActions,
  MessageContent as AIMessageContent,
  MessageResponse as AIMessageResponse,
  MessageToolbar as AIMessageToolbar,
} from "@/components/ai-elements/message";
import {
  Reasoning as AIReasoning,
  ReasoningContent as AIReasoningContent,
  ReasoningTrigger as AIReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { cn } from "@/lib/utils";

// ============================================================================
// L1 Wrappers with App Styling
// ============================================================================

/**
 * Message.Root - Wraps ai-elements Message with consistent styling
 */
export type MessageRootProps = ComponentProps<typeof AIMessage>;

const MessageRoot = memo(function MessageRoot({
  className,
  ...props
}: MessageRootProps) {
  return <AIMessage className={cn(className)} {...props} />;
});

/**
 * Message.Content - Wraps ai-elements MessageContent
 * For role-specific styling, use ChatMessageContent instead
 */
export type MessageContentProps = ComponentProps<typeof AIMessageContent>;

const MessageContent = memo(function MessageContent({
  className,
  ...props
}: MessageContentProps) {
  return <AIMessageContent className={cn(className)} {...props} />;
});

/**
 * Message.Response - Memoized markdown renderer from ai-elements
 */
export type MessageResponseProps = ComponentProps<typeof AIMessageResponse>;

const MessageResponse = memo(function MessageResponse({
  className,
  ...props
}: MessageResponseProps) {
  return (
    <AIMessageResponse
      className={cn("[&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      {...props}
    />
  );
});

/**
 * Message.Actions - Wraps ai-elements MessageActions
 */
export type MessageActionsProps = ComponentProps<typeof AIMessageActions>;

const MessageActions = memo(function MessageActions(
  props: MessageActionsProps
) {
  return <AIMessageActions {...props} />;
});

/**
 * Message.Action - Wraps ai-elements MessageAction
 */
export type MessageActionProps = ComponentProps<typeof AIMessageAction>;

const MessageAction = memo(function MessageAction(props: MessageActionProps) {
  return <AIMessageAction {...props} />;
});

/**
 * Message.Toolbar - Wraps ai-elements MessageToolbar (footer container)
 */
export type MessageToolbarProps = ComponentProps<typeof AIMessageToolbar>;

const MessageToolbar = memo(function MessageToolbar({
  className,
  ...props
}: MessageToolbarProps) {
  return <AIMessageToolbar className={cn(className)} {...props} />;
});

// ============================================================================
// Reasoning Wrappers
// ============================================================================

/**
 * Message.Reasoning - Wraps ai-elements Reasoning collapsible
 * Use ThinkingBlock for the full custom implementation with preview
 */
export type MessageReasoningProps = ComponentProps<typeof AIReasoning>;

const MessageReasoning = memo(function MessageReasoning({
  className,
  ...props
}: MessageReasoningProps) {
  return <AIReasoning className={cn("not-prose mb-4", className)} {...props} />;
});

/**
 * Message.ReasoningTrigger - Header trigger for reasoning block
 */
export type MessageReasoningTriggerProps = ComponentProps<
  typeof AIReasoningTrigger
>;

const MessageReasoningTrigger = memo(function MessageReasoningTrigger(
  props: MessageReasoningTriggerProps
) {
  return <AIReasoningTrigger {...props} />;
});

/**
 * Message.ReasoningContent - Content area for reasoning block
 */
export type MessageReasoningContentProps = ComponentProps<
  typeof AIReasoningContent
>;

const MessageReasoningContent = memo(function MessageReasoningContent({
  className,
  ...props
}: MessageReasoningContentProps) {
  return (
    <AIReasoningContent
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
});

// ============================================================================
// Namespace Export
// ============================================================================

/**
 * Unified Message compound - wraps L1 ai-elements with app styling.
 *
 * Usage:
 * ```tsx
 * import { Message } from "@/components/ui-custom/chat/message";
 * import { ThinkingBlock } from "@/components/ui-custom/chat/thinking-block";
 * import { ChatMessageContent } from "@/components/ui-custom/chat/message-content";
 * import { ChatMessageFooter } from "@/components/ui-custom/chat/message-footer";
 *
 * <Message.Root from="assistant">
 *   <ThinkingBlock isStreaming={isStreaming} durationMs={duration}>
 *     {reasoning}
 *   </ThinkingBlock>
 *   <ChatMessageContent variant="assistant">
 *     <Message.Response>{content}</Message.Response>
 *   </ChatMessageContent>
 *   <ChatMessageFooter>...</ChatMessageFooter>
 * </Message.Root>
 * ```
 */
export const Message = {
  // L1 Wrappers - use these for consistent styling
  Root: MessageRoot,
  Content: MessageContent,
  Response: MessageResponse,
  Actions: MessageActions,
  Action: MessageAction,
  Toolbar: MessageToolbar,

  // Reasoning (L1 wrappers) - or use ThinkingBlock for custom impl
  Reasoning: MessageReasoning,
  ReasoningTrigger: MessageReasoningTrigger,
  ReasoningContent: MessageReasoningContent,
};
