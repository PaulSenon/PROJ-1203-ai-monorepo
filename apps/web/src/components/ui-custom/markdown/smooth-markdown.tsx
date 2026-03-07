"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import { cjk } from "@streamdown/cjk";
import { createMathPlugin } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";
import { useMemo } from "react";
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

const STREAMDOWN_ANIMATED = {
  animation: "slideUp",
  duration: 200,
  easing: "ease-out",
  sep: "word",
} as const;

const STREAMDOWN_CONTROLS = {
  table: true,
  code: true,
  mermaid: {
    download: true,
    copy: true,
    fullscreen: true,
    panZoom: true,
  },
} as const;

const STREAMDOWN_REMEND = {
  linkMode: "text-only",
} as const;

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
  const trustedDomains = linkPolicy?.trustedDomains ?? DEFAULT_TRUSTED_DOMAINS;

  if (consolidate) {
    return (
      <BaseSmoothMarkdown
        className={className}
        enableCodeHighlighting={enableCodeHighlighting}
        isStreaming={Boolean(isStreaming)}
        mode="static"
        trustedDomains={trustedDomains}
      >
        {children}
      </BaseSmoothMarkdown>
    );
  }

  return (
    <StreamingSmoothMarkdown
      className={className}
      enableCodeHighlighting={enableCodeHighlighting}
      isStreaming={Boolean(isStreaming)}
      startStreaming={startStreaming}
      trustedDomains={trustedDomains}
    >
      {children}
    </StreamingSmoothMarkdown>
  );
}

type BaseSmoothMarkdownProps = {
  children: string;
  className?: string;
  enableCodeHighlighting: boolean;
  isStreaming: boolean;
  mode: "static" | "streaming";
  trustedDomains: string[];
};

function BaseSmoothMarkdown({
  children,
  className,
  enableCodeHighlighting,
  isStreaming,
  mode,
  trustedDomains,
}: BaseSmoothMarkdownProps) {
  const linkSafety = useMemo(
    () => ({
      enabled: true,
      onLinkCheck: (url: string) => {
        if (typeof window === "undefined") return false;
        return (
          resolveLinkKind(url, window.location.origin, trustedDomains) ===
          "in_app"
        );
      },
      renderModal: (props: Parameters<typeof LinkSafetyModal>[0]) => (
        <LinkSafetyModal {...props} trustedDomains={trustedDomains} />
      ),
    }),
    [trustedDomains]
  );

  return (
    <Streamdown
      animated={STREAMDOWN_ANIMATED}
      caret="circle"
      className={className}
      controls={STREAMDOWN_CONTROLS}
      isAnimating={mode === "streaming" && isStreaming}
      linkSafety={linkSafety}
      mode={mode}
      plugins={
        enableCodeHighlighting
          ? streamdownPluginsWithCode
          : streamdownBasePlugins
      }
      remend={STREAMDOWN_REMEND}
    >
      {children}
    </Streamdown>
  );
}

type StreamingSmoothMarkdownProps = Omit<BaseSmoothMarkdownProps, "mode"> & {
  startStreaming?: boolean;
};

function StreamingSmoothMarkdown({
  children,
  className,
  enableCodeHighlighting,
  isStreaming,
  startStreaming,
  trustedDomains,
}: StreamingSmoothMarkdownProps) {
  const [text] = useSmoothText(children, {
    startStreaming: startStreaming ?? false,
    charsPerSec: 200,
  });

  return (
    <BaseSmoothMarkdown
      className={className}
      enableCodeHighlighting={enableCodeHighlighting}
      isStreaming={isStreaming}
      mode="streaming"
      trustedDomains={trustedDomains}
    >
      {text}
    </BaseSmoothMarkdown>
  );
}
