import type { MyUIMessagePart } from "@ai-monorepo/ai/types/uiMessage";
import { memo, useDeferredValue } from "react";
import { Reasoning } from "@/components/ui-custom/chat/reasoning";
import { SmoothMarkdown } from "@/components/ui-custom/markdown/smooth-markdown";
import { cn } from "@/lib/utils";

type ReasoningPartType = Extract<MyUIMessagePart, { type: "reasoning" }>;

export type ReasoningPartProps = {
  part: ReasoningPartType;
  previewLines?: number;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
};

const DEFAULT_PREVIEW_LINES = 2;
const NON_WHITESPACE_PATTERN = /\S/;
const MARKDOWN_OVERFLOW_GUARDS =
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto";

export const ReasoningPart = memo(function _ReasoningPart({
  part,
  previewLines = DEFAULT_PREVIEW_LINES,
  consolidate,
  enableCodeHighlighting,
}: ReasoningPartProps) {
  const isStreaming = part.state === "streaming";
  const text = part.text ?? "";
  const hasText = NON_WHITESPACE_PATTERN.test(text);

  return (
    <Reasoning.Root
      className="w-full"
      disabled={!hasText}
      isStreaming={isStreaming}
    >
      <Reasoning.Trigger />
      <Reasoning.Preview lines={previewLines}>{text}</Reasoning.Preview>
      <Reasoning.Content>
        {hasText ? (
          <DeferredReasoningMarkdown
            consolidate={consolidate}
            enableCodeHighlighting={enableCodeHighlighting}
            isStreaming={isStreaming}
            text={text}
          />
        ) : null}
      </Reasoning.Content>
    </Reasoning.Root>
  );
});

type DeferredReasoningMarkdownProps = {
  text: string;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
  isStreaming: boolean;
};

const DeferredReasoningMarkdown = memo(function _DeferredReasoningMarkdown({
  text,
  consolidate,
  enableCodeHighlighting,
  isStreaming,
}: DeferredReasoningMarkdownProps) {
  const deferredText = useDeferredValue(text);

  return (
    <SmoothMarkdown
      className={cn(
        "text-muted-foreground text-sm",
        MARKDOWN_OVERFLOW_GUARDS
      )}
      consolidate={consolidate}
      enableCodeHighlighting={enableCodeHighlighting}
      isStreaming={isStreaming}
    >
      {deferredText}
    </SmoothMarkdown>
  );
});
