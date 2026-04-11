import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import { memo } from "react";
import { SmoothMarkdown } from "@/components/ui-custom/markdown/smooth-markdown";
import { cn } from "@/lib/utils";
import { getPartRenderPolicy } from "../_helpers/message-render-policy";

type TextPart = Extract<MyUIMessage["parts"][number], { type: "text" }>;

export type TextPartProps = {
  text: TextPart["text"];
  state: TextPart["state"];
  metadata?: MyUIMessageMetadata;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
};

const MARKDOWN_OVERFLOW_GUARDS =
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto";

export const TextPart = memo(function _TextPart({
  text: rawText,
  state,
  metadata,
  consolidate,
  enableCodeHighlighting,
}: TextPartProps) {
  const text = rawText ?? "";
  if (!text.trim()) return null;

  const renderPolicy = getPartRenderPolicy({
    metadata,
    partState: state,
    consolidate,
  });

  return (
    <SmoothMarkdown
      className={cn(MARKDOWN_OVERFLOW_GUARDS)}
      consolidate={renderPolicy.markdownMode === "static"}
      enableCodeHighlighting={enableCodeHighlighting}
      isStreaming={renderPolicy.isStreaming}
    >
      {text}
    </SmoothMarkdown>
  );
});
