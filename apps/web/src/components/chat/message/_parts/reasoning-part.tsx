import type { MyUIMessagePart } from "@ai-monorepo/ai/types/uiMessage";
import { BrainIcon, ChevronRightIcon } from "lucide-react";
import { useDeferredValue } from "react";
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
  const isStreaming = part.state === "streaming";
  const text = part.text ?? "";
  const deferredText = useDeferredValue(text);
  const trimmedText = text.trim();
  const hasText = trimmedText.length > 0;
  const headerLabel = isStreaming ? (
    <Shimmer as="span" duration={1}>
      Reasoning...
    </Shimmer>
  ) : (
    "Thought for a few seconds"
  );

  return (
    <Reasoning.Root
      className="w-full"
      disabled={!hasText}
      isStreaming={isStreaming}
    >
      <Reasoning.Trigger>
        <BrainIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">{headerLabel}</span>
        <ChevronRightIcon
          aria-hidden="true"
          className={cn(
            "ml-auto size-4 shrink-0 transition-transform",
            "group-data-disabled:invisible",
            "group-data-[state=open]:rotate-90"
          )}
        />
      </Reasoning.Trigger>
      <Reasoning.Preview lines={PREVIEW_LINES}>{text}</Reasoning.Preview>
      <Reasoning.Content>
        {hasText ? (
          <SmoothMarkdown
            className={cn(
              "text-muted-foreground text-sm",
              MARKDOWN_OVERFLOW_GUARDS
            )}
          >
            {deferredText}
          </SmoothMarkdown>
        ) : (
          ""
        )}
      </Reasoning.Content>
    </Reasoning.Root>
  );
}
