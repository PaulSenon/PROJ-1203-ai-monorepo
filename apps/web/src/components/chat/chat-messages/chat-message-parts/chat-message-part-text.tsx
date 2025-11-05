import type { ComponentProps } from "react";
import { SmoothMarkdown } from "../smooth-streamed-markdown";

type ChatMessagePartTextProps = ComponentProps<typeof SmoothMarkdown> & {
  children: string;
};

export function ChatMessagePartText({
  children,
  ...props
}: ChatMessagePartTextProps) {
  return <SmoothMarkdown {...props}>{children}</SmoothMarkdown>;
}
