import {
  MyMetadataHelper,
  type MyUIMessage,
} from "@ai-monorepo/ai/types/uiMessage";
import {
  AlertCircleIcon,
  BanIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  CpuIcon,
  GitBranchIcon,
  RefreshCcwIcon,
  ZapIcon,
} from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";
import { ChatMessageAction } from "./primitives/message-action";
import { ChatMessageActions } from "./primitives/message-actions";
import { ChatMessageContent } from "./primitives/message-content";
import { ChatMessageFooter } from "./primitives/message-footer";
import { ChatMessageInfo } from "./primitives/message-info";
import { ChatMessageInfos } from "./primitives/message-infos";
import { ThinkingBlock } from "./primitives/thinking-block";

type ExtraStats = {
  modelId?: string;
  tokensPerSec?: number;
  totalTokens?: number;
  timeToFirst?: number;
};

export type ChatMessageProps = ComponentProps<"div"> & {
  message: MyUIMessage;
  onRetry?: (message: MyUIMessage) => void;
  onCopy?: (message: MyUIMessage) => void;
  onBranch?: (message: MyUIMessage) => void;
};

type MessageStatus =
  | "pending"
  | "streaming"
  | "completed"
  | "error"
  | "cancelled";

function getStatus(message: MyUIMessage): MessageStatus {
  const live = message.metadata?.liveStatus;
  if (live === "pending") return "pending";
  if (live === "streaming") return "streaming";
  if (live === "error") return "error";
  if (live === "cancelled") return "cancelled";
  return "completed";
}

function StatusIndicator({ status }: { status: MessageStatus }) {
  switch (status) {
    case "pending":
      return (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader size={14} />
          <span>Thinking...</span>
        </div>
      );
    case "streaming":
      return null;
    case "error":
      return (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircleIcon className="size-4" />
          <span>An error occurred</span>
        </div>
      );
    case "cancelled":
      return (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <BanIcon className="size-4" />
          <span>Response cancelled</span>
        </div>
      );
    default:
      return null;
  }
}

export function ChatMessage({
  className,
  message,
  onRetry,
  onCopy,
  onBranch,
  ...props
}: ChatMessageProps) {
  const status = getStatus(message);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const [copied, setCopied] = useState(false);

  const metadataHelper = useMemo(
    () => new MyMetadataHelper(message.metadata),
    [message.metadata]
  );

  // TODO ref
  const textContent = useMemo(
    () =>
      message.parts
        .filter((part) => part.type === "text")
        .map((part: { text?: string }) => part.text ?? "")
        .join("\n"),
    [message.parts]
  );

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

  return (
    <div
      className={cn(
        "group flex w-full flex-col gap-2",
        isUser && "items-end",
        isAssistant && "items-start",
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
          {status !== "completed" && status !== "streaming" && (
            <StatusIndicator status={status} />
          )}

          {message.parts.map((part, i) => {
            if (part.type === "reasoning") {
              return (
                <ThinkingBlock
                  defaultOpen={false}
                  duration={metadataHelper.thinkingDuration}
                  isStreaming={status === "streaming"}
                  key={`reasoning-${i}`}
                >
                  {part.text ?? ""}
                </ThinkingBlock>
              );
            }

            if (part.type === "text") {
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
