import { useSmoothText } from "@convex-dev/agent/react";
import type { ComponentProps } from "react";
import { MessageResponse } from "@/components/ai-elements/message";

export function SmoothMarkdown({
  children,
  ...props
}: ComponentProps<typeof MessageResponse>) {
  const [text] = useSmoothText(children as string);
  return <MessageResponse {...props}>{text}</MessageResponse>;
}
