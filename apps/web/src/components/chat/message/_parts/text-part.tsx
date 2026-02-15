import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { SmoothMarkdown } from "@/components/ui-custom/markdown/smooth-markdown";

type TextPart = Extract<MyUIMessage["parts"][number], { type: "text" }>;

export type TextPartProps = {
  part: TextPart;
  isStreaming?: boolean;
};

const MARKDOWN_OVERFLOW_GUARDS =
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto";

export function TextPart({ part, isStreaming }: TextPartProps) {
  const text = part.text ?? "";

  if (!text.trim()) return null;

  return (
    <SmoothMarkdown
      className={MARKDOWN_OVERFLOW_GUARDS}
      isStreaming={isStreaming}
    >
      {text}
    </SmoothMarkdown>
  );
}
