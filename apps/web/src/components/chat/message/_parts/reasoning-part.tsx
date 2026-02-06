import type { MyUIMessagePart } from "@ai-monorepo/ai/types/uiMessage";
import { useDeferredValue } from "react";
import { Reasoning } from "@/components/ui-custom/chat/reasoning";
import { SmoothMarkdown } from "@/components/ui-custom/markdown/smooth-markdown";
import { cn } from "@/lib/utils";

type ReasoningPartType = Extract<MyUIMessagePart, { type: "reasoning" }>;

export type ReasoningPartProps = {
  part: ReasoningPartType;
};

const PREVIEW_LINES = 2;
const NON_WHITESPACE_PATTERN = /\S/;
const MARKDOWN_OVERFLOW_GUARDS =
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto";

export function ReasoningPart({ part }: ReasoningPartProps) {
  const isStreaming = part.state === "streaming";
  const text = part.text ?? "";
  const deferredText = useDeferredValue(text);
  const hasText = NON_WHITESPACE_PATTERN.test(text);

  return (
    <Reasoning.Root
      className="w-full"
      disabled={!hasText}
      isStreaming={isStreaming}
    >
      <Reasoning.Trigger />
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
        ) : null}
      </Reasoning.Content>
    </Reasoning.Root>
  );
}
