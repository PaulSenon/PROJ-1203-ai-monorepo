import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { Message } from "@/components/ui-custom/chat/message";

type TextPart = Extract<MyUIMessage["parts"][number], { type: "text" }>;

export type TextPartProps = {
  part: TextPart;
};

export function TextPart({ part }: TextPartProps) {
  if (!part.text?.trim()) return null;

  return (
    <Message.Response className="overflow-x-auto">{part.text}</Message.Response>
  );
}
