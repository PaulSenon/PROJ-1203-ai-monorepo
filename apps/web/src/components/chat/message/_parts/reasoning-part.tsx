import type {
  MyUIMessageMetadata,
  MyUIMessagePart,
} from "@ai-monorepo/ai/types/uiMessage";
import { memo, useDeferredValue } from "react";
import { Reasoning } from "@/components/ui-custom/chat/reasoning";
import { SmoothMarkdown } from "@/components/ui-custom/markdown/smooth-markdown";
import { cn } from "@/lib/utils";
import { getPartRenderPolicy } from "../_helpers/message-render-policy";

type ReasoningPartType = Extract<MyUIMessagePart, { type: "reasoning" }>;

export type ReasoningPartProps = {
  part: ReasoningPartType;
  metadata?: MyUIMessageMetadata;
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
  metadata,
  previewLines = DEFAULT_PREVIEW_LINES,
  consolidate,
  enableCodeHighlighting,
}: ReasoningPartProps) {
  const text = part.text ?? "";
  const deferredText = useDeferredValue(text);
  const hasText = NON_WHITESPACE_PATTERN.test(text);
  const renderPolicy = getPartRenderPolicy({
    metadata,
    partState: part.state,
    consolidate,
  });

  return (
    <Reasoning.Root
      className="w-full"
      disabled={!hasText}
      isStreaming={renderPolicy.isStreaming}
    >
      <Reasoning.Trigger />
      <Reasoning.Preview lines={previewLines}>{text}</Reasoning.Preview>
      <Reasoning.Content>
        {hasText ? (
          <SmoothMarkdown
            className={cn(
              "text-muted-foreground text-sm",
              MARKDOWN_OVERFLOW_GUARDS
            )}
            consolidate={renderPolicy.markdownMode === "static"}
            enableCodeHighlighting={enableCodeHighlighting}
            isStreaming={renderPolicy.isStreaming}
          >
            {deferredText}
          </SmoothMarkdown>
        ) : null}
      </Reasoning.Content>
    </Reasoning.Root>
  );
});
