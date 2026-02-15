"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import { Streamdown } from "streamdown";

export type SmoothMarkdownLinkPolicy = {
  trustedDomains?: string[];
};

export type SmoothMarkdownProps = {
  children: string;
  isStreaming?: boolean;
  startStreaming?: boolean;
  className?: string;
  linkPolicy?: SmoothMarkdownLinkPolicy;
};

export function SmoothMarkdown({
  children,
  className,
  isStreaming,
  startStreaming,
}: SmoothMarkdownProps) {
  const [text] = useSmoothText(children, {
    startStreaming: startStreaming ?? false,
    charsPerSec: 1000,
  });

  return (
    <Streamdown className={className} isAnimating={Boolean(isStreaming)}>
      {text}
    </Streamdown>
  );
}
