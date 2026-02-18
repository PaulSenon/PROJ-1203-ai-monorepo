"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import { cjk } from "@streamdown/cjk";
import { createCodePlugin } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";
import { DEFAULT_TRUSTED_DOMAINS, resolveLinkKind } from "./link-policy";
import { LinkSafetyModal } from "./link-safety-modal";

const streamdownPlugins = {
  code: createCodePlugin({
    themes: ["github-dark", "github-light"],
  }),
  mermaid,
  math,
  cjk,
};

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
  linkPolicy,
  startStreaming,
}: SmoothMarkdownProps) {
  const [text] = useSmoothText(children, {
    startStreaming: startStreaming ?? false,
    charsPerSec: 200,
  });
  const trustedDomains = linkPolicy?.trustedDomains ?? DEFAULT_TRUSTED_DOMAINS;

  return (
    <Streamdown
      animated={{
        animation: "slideUp",
        duration: 200,
        easing: "ease-out",
        sep: "word",
      }}
      caret="circle"
      className={className}
      controls={{
        table: true, // Show table download button
        code: true, // Show code copy button
        mermaid: {
          download: true, // Show mermaid download button
          copy: true, // Show mermaid copy button
          fullscreen: true, // Show mermaid fullscreen button
          panZoom: true, // Show mermaid pan/zoom controls
        },
      }}
      isAnimating={Boolean(isStreaming)}
      linkSafety={{
        enabled: true,
        onLinkCheck: (url) => {
          if (typeof window === "undefined") return false;
          return (
            resolveLinkKind(url, window.location.origin, trustedDomains) ===
            "in_app"
          );
        },
        renderModal: (props) => (
          <LinkSafetyModal {...props} trustedDomains={trustedDomains} />
        ),
      }}
      mode={isStreaming ? "streaming" : "static"}
      plugins={streamdownPlugins}
      remend={{
        linkMode: "text-only",
      }}
    >
      {text}
    </Streamdown>
  );
}
