"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import { cjk } from "@streamdown/cjk";
import { createMathPlugin } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { type ComponentProps, useCallback, useMemo } from "react";
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

type StreamdownLinkSafety = NonNullable<
  ComponentProps<typeof Streamdown>["linkSafety"]
>;
type StreamdownLinkCheck = NonNullable<StreamdownLinkSafety["onLinkCheck"]>;
type StreamdownRenderModal = NonNullable<StreamdownLinkSafety["renderModal"]>;

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
  const [text] = useSmoothText(children, {
    startStreaming: startStreaming ?? false,
    charsPerSec: 200,
  });

  const trustedDomains = linkPolicy?.trustedDomains ?? DEFAULT_TRUSTED_DOMAINS;

  const onLinkCheck = useCallback<StreamdownLinkCheck>(
    (url) => {
      if (typeof window === "undefined") return false;
      return (
        resolveLinkKind(url, window.location.origin, trustedDomains) ===
        "in_app"
      );
    },
    [trustedDomains]
  );

  const renderModal = useCallback<StreamdownRenderModal>(
    (props) => <LinkSafetyModal {...props} trustedDomains={trustedDomains} />,
    [trustedDomains]
  );

  const linkSafety = useMemo<StreamdownLinkSafety>(
    () => ({
      enabled: true,
      onLinkCheck,
      renderModal,
    }),
    [onLinkCheck, renderModal]
  );

  return (
    <Streamdown
      animated={STREAMDOWN_ANIMATED}
      caret="circle"
      className={className}
      controls={STREAMDOWN_CONTROLS}
      isAnimating={Boolean(isStreaming)}
      linkSafety={linkSafety}
      mode={consolidate ? "static" : "streaming"}
      plugins={
        enableCodeHighlighting
          ? streamdownPluginsWithCode
          : streamdownBasePlugins
      }
      remend={STREAMDOWN_REMEND}
    >
      {text}
    </Streamdown>
  );
}
