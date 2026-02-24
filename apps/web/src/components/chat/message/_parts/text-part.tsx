import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { memo } from "react";
import { SmoothMarkdown } from "@/components/ui-custom/markdown/smooth-markdown";
import { cn } from "@/lib/utils";

type TextPart = Extract<MyUIMessage["parts"][number], { type: "text" }>;

export type TextPartProps = {
  part: TextPart;
  consolidate?: boolean;
  enableCodeHighlighting?: boolean;
};

const MARKDOWN_OVERFLOW_GUARDS =
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto";

export const TextPart = memo(function _TextPart({
  part,
  consolidate,
  enableCodeHighlighting,
}: TextPartProps) {
  const text = part.text ?? "";
  if (!text.trim()) return null;

  const isStreaming = part.state === "streaming";

  return (
    <SmoothMarkdown
      className={cn(MARKDOWN_OVERFLOW_GUARDS)}
      consolidate={consolidate}
      enableCodeHighlighting={enableCodeHighlighting}
      isStreaming={isStreaming}
    >
      {text}
    </SmoothMarkdown>
  );
});
