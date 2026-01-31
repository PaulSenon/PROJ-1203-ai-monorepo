import type { MyUIMessagePart } from "@ai-monorepo/ai/types/uiMessage";
import { BrainIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Reasoning } from "@/components/ui-custom/chat/reasoning";
import { SmoothMarkdown } from "@/components/ui-custom/markdown/smooth-markdown";
import { cn } from "@/lib/utils";

type ReasoningPartType = Extract<MyUIMessagePart, { type: "reasoning" }>;

export type ReasoningPartProps = {
  part: ReasoningPartType;
};

const PREVIEW_LINES = 2;
const MARKDOWN_OVERFLOW_GUARDS =
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto";

export function ReasoningPart({ part }: ReasoningPartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isStreaming = part.state === "streaming";
  const showPreview = isStreaming && !isOpen;
  const text = part.text ?? "";

  return (
    <Reasoning.Root
      className="w-full"
      isStreaming={isStreaming}
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <Reasoning.Trigger aria-label="Toggle reasoning">
        <BrainIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">
          {isStreaming ? (
            <Shimmer as="span" duration={1}>
              Reasoning...
            </Shimmer>
          ) : (
            "Thought for a few seconds"
          )}
        </span>
        <ChevronRightIcon
          aria-hidden="true"
          className={cn(
            "ml-auto size-4 shrink-0 transition-transform",
            isOpen && "rotate-90"
          )}
        />
      </Reasoning.Trigger>
      {showPreview ? (
        <Reasoning.Preview lines={PREVIEW_LINES}>{text}</Reasoning.Preview>
      ) : null}
      {isOpen ? (
        <Reasoning.Content>
          <SmoothMarkdown
            className={cn(
              "text-muted-foreground text-sm",
              MARKDOWN_OVERFLOW_GUARDS
            )}
          >
            {text}
          </SmoothMarkdown>
        </Reasoning.Content>
      ) : null}
    </Reasoning.Root>
  );
}
