"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import { cjk } from "@streamdown/cjk";
import { createMathPlugin } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";
import { DEFAULT_TRUSTED_DOMAINS, resolveLinkKind } from "./link-policy";
import { LinkSafetyModal } from "./link-safety-modal";
import { workerCodePlugin } from "./worker-code-highlighter-plugin";

const streamdownBasePlugins = {
  mermaid,
  math: createMathPlugin({
    singleDollarTextMath: true,
  }),
  cjk,
};

const streamdownPluginsWithCode = {
  ...streamdownBasePlugins,
  code: workerCodePlugin,
};

export type SmoothMarkdownLinkPolicy = {
  trustedDomains?: string[];
};

export type SmoothMarkdownProps = {
  children: string;
  isStreaming?: boolean;
  consolidate?: boolean;
  startStreaming?: boolean;
  enableCodeHighlighting?: boolean;
  className?: string;
  linkPolicy?: SmoothMarkdownLinkPolicy;
};

export function SmoothMarkdown({
  children,
  className,
  isStreaming,
  linkPolicy,
  startStreaming,
  enableCodeHighlighting = true,
  consolidate,
}: SmoothMarkdownProps) {
  // Settled or consolidated rows should render the full final text immediately.
  const shouldAnimate = Boolean(isStreaming) && !consolidate;

  const [smoothedText] = useSmoothText(children, {
    startStreaming: startStreaming ?? false,
    charsPerSec: 200,
  });
  const text = shouldAnimate ? smoothedText : children;

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
      isAnimating={shouldAnimate}
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
      mode={shouldAnimate ? "streaming" : "static"}
      plugins={
        enableCodeHighlighting
          ? streamdownPluginsWithCode
          : streamdownBasePlugins
      }
      remend={{
        linkMode: "text-only",
      }}
    >
      {text}
    </Streamdown>
  );
}
