import { useSmoothText } from "@convex-dev/agent/react";
import type { ComponentProps } from "react";
import { Response } from "@/components/ai-elements/response";

export function SmoothMarkdown({
  children,
  ...props
}: ComponentProps<typeof Response>) {
  const [text] = useSmoothText(children as string);
  return <Response {...props}>{text}</Response>;
}
