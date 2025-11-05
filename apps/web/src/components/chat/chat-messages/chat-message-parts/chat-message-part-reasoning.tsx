import { type ComponentProps, memo } from "react";
import {
  Reasoning,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SmoothMarkdown } from "../smooth-streamed-markdown";

type SmoothReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  children: string;
};

const SmoothReasoningContent = memo(
  ({ className, children, ...props }: SmoothReasoningContentProps) => (
    <CollapsibleContent
      className={cn(
        "mt-4 text-sm",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      {...props}
    >
      <SmoothMarkdown className="grid gap-2">{children}</SmoothMarkdown>
    </CollapsibleContent>
  )
);

export function ChatMessagePartReasoning({ children }: { children: string }) {
  return (
    <Reasoning>
      <ReasoningTrigger>Thinking...</ReasoningTrigger>
      <SmoothReasoningContent>{children}</SmoothReasoningContent>
    </Reasoning>
  );
}
