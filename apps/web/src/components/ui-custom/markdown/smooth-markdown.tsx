"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";

export type SmoothMarkdownProps = Omit<
  ComponentProps<typeof Streamdown>,
  "children"
> & {
  children: string;
  startStreaming?: boolean;
};

export function SmoothMarkdown({
  children,
  startStreaming,
  ...props
}: SmoothMarkdownProps) {
  const [text] = useSmoothText(children, {
    startStreaming: startStreaming ?? false,
    charsPerSec: 1000,
  });

  return <Streamdown {...props}>{text}</Streamdown>;
}
