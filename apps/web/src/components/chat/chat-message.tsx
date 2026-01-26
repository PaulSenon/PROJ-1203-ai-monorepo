import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  CpuIcon,
  GitBranchIcon,
  RefreshCcwIcon,
  ZapIcon,
} from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { Message, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ChatMessageAction } from "@/components/ui-custom/chat/message-action";
import { ChatMessageActions } from "@/components/ui-custom/chat/message-actions";
import { ChatMessageContent } from "@/components/ui-custom/chat/message-content";
import { ChatMessageFooter } from "@/components/ui-custom/chat/message-footer";
import { ChatMessageInfo } from "@/components/ui-custom/chat/message-info";
import { ChatMessageInfos } from "@/components/ui-custom/chat/message-infos";
import { ThinkingBlock } from "@/components/ui-custom/chat/thinking-block";
import { cn } from "@/lib/utils";
import { ChatMessageStatusAdapter } from "./chat-message-status";

type ExtraStats = {
  modelId?: string;
  tokensPerSec?: number;
  totalTokens?: number;
  timeToFirst?: number;
};

export type ChatMessageProps = ComponentProps<"div"> & {
  message: MyUIMessage;
  onRetry?: (message: MyUIMessage) => void;
  onRetryWithModel?: (message: MyUIMessage) => void;
  onContinue?: (message: MyUIMessage) => void;
  onCopy?: (message: MyUIMessage) => void;
  onBranch?: (message: MyUIMessage) => void;
};

const MOCK_THINKING_DURATION_MS = 8200;

export function ChatMessage({
  className,
  message,
  onRetry,
  onRetryWithModel,
  onContinue,
  onCopy,
  onBranch,
  ...props
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const [copied, setCopied] = useState(false);

  // TODO ref
  const { hasReasoningContent, hasTextContent, textContent } = useMemo(() => {
    let hasReasoning = false;
    let hasText = false;
    const textChunks: string[] = [];

    for (const part of message.parts) {
      if (part.type === "reasoning" && part.text?.trim()) {
        hasReasoning = true;
      }

      if (part.type === "text" && part.text?.trim()) {
        hasText = true;
        textChunks.push(part.text ?? "");
      }
    }

    return {
      hasReasoningContent: hasReasoning,
      hasTextContent: hasText,
      textContent: textChunks.join("\n"),
    };
  }, [message.parts]);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(message);
    } else if (
      typeof window !== "undefined" &&
      navigator?.clipboard?.writeText
    ) {
      await navigator.clipboard.writeText(textContent);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actions = isAssistant
    ? [
        onCopy && {
          key: "copy-custom",
          icon: copied ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          ),
          tooltip: copied ? "Copied" : "Copy",
          onClick: handleCopy,
        },
        !onCopy && {
          key: "copy",
          icon: copied ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          ),
          tooltip: copied ? "Copied" : "Copy",
          onClick: handleCopy,
        },
        onBranch && {
          key: "branch",
          icon: <GitBranchIcon className="size-4" />,
          tooltip: "Branch",
          onClick: () => onBranch(message),
        },
        onRetry && {
          key: "retry",
          icon: <RefreshCcwIcon className="size-4" />,
          tooltip: "Retry",
          onClick: () => onRetry(message),
        },
      ].filter(Boolean)
    : [];

  const stats = (message.metadata ?? {}) as MyUIMessage["metadata"] &
    ExtraStats;

  const source = (message.metadata as Record<string, unknown>)
    ?.dataSource as string;

  const isStreaming =
    message.metadata?.liveStatus === "pending" ||
    message.metadata?.liveStatus === "streaming";

  const showThinkingLoader =
    isAssistant && !hasReasoningContent && !hasTextContent;

  return (
    <div
      className={cn(
        "group flex w-full flex-col gap-2",
        isUser && "items-end",
        isAssistant && "items-start",
        message.metadata?.lifecycleState === "deleted" ? "bg-red-500" : "",
        isStreaming && isAssistant && source === "cache" ? "opacity-50" : "", // TODO: better, we need a proper isStale state and not rely on my hacky debug source flag
        source === "cache" ? "border border-yellow-500 p-2" : "",
        source === "convex-persisted" ? "border border-orange-500 p-2" : "",
        source === "optimistic" ? "border border-purple-500 p-2" : "",
        source === "http-stream" ? "border border-green-500 p-2" : "",
        source === "convex-stream" ? "border border-blue-500 p-2" : "",
        className
      )}
      {...props}
    >
      <Message
        className={cn(
          "w-full max-w-full",
          isUser && "max-w-[90%] sm:max-w-[80%]"
        )}
        from={message.role}
      >
        <ChatMessageContent variant={isUser ? "user" : "assistant"}>
          {showThinkingLoader && (
            <div className="flex min-h-6 items-center gap-2 text-muted-foreground text-sm">
              <Shimmer as="span" duration={1}>
                Thinking...
              </Shimmer>
            </div>
          )}

          {message.parts.map((part, i) => {
            if (part.type === "reasoning") {
              if (!part.text?.trim()) return null;
              return (
                <ThinkingBlock
                  defaultOpen={false}
                  durationMs={MOCK_THINKING_DURATION_MS}
                  hasResponseText={hasTextContent}
                  isStreaming={isStreaming}
                  key={`reasoning-${i}`}
                >
                  {part.text ?? ""}
                </ThinkingBlock>
              );
            }

            if (part.type === "text") {
              if (!part.text?.trim()) return null;
              return (
                <MessageResponse
                  className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  key={`text-${i}`}
                >
                  {part.text ?? ""}
                </MessageResponse>
              );
            }

            return null;
          })}
          <ChatMessageStatusAdapter
            message={message}
            onContinue={onContinue}
            onRetry={onRetry}
            onRetryWithModel={onRetryWithModel}
          />
        </ChatMessageContent>
      </Message>

      {isAssistant && actions.length > 0 && (
        <ChatMessageFooter>
          <ChatMessageActions>
            {actions.map(
              (action) =>
                action && (
                  <ChatMessageAction
                    icon={action.icon}
                    key={action.key}
                    onClick={action.onClick}
                    tooltip={action.tooltip}
                  />
                )
            )}
          </ChatMessageActions>

          <ChatMessageInfos>
            {stats?.modelId && (
              <ChatMessageInfo
                icon={<CpuIcon className="size-3" />}
                label={stats.modelId}
              />
            )}
            {typeof stats?.tokensPerSec === "number" && (
              <ChatMessageInfo icon={<ZapIcon className="size-3" />}>
                {stats.tokensPerSec.toFixed(1)} tok/sec
              </ChatMessageInfo>
            )}
            {typeof stats?.totalTokens === "number" && (
              <ChatMessageInfo icon={<CpuIcon className="size-3" />}>
                {stats.totalTokens} tokens
              </ChatMessageInfo>
            )}
            {typeof stats?.timeToFirst === "number" && (
              <ChatMessageInfo icon={<ClockIcon className="size-3" />}>
                TTFT: {stats.timeToFirst.toFixed(2)}s
              </ChatMessageInfo>
            )}
          </ChatMessageInfos>
        </ChatMessageFooter>
      )}
    </div>
  );
}
