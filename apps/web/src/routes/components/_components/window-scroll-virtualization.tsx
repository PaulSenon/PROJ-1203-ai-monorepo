import {
  LegendList,
  type LegendListRef,
  type LegendListRenderItemProps,
} from "@legendapp/list/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SmoothMarkdown } from "@/components/ui-custom/markdown/smooth-markdown";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/components/_components/window-scroll-virtualization"
)({
  component: RouteComponent,
});

type MarkdownPreset = {
  id: string;
  title: string;
  markdown: string;
};

type MarkdownItem = {
  id: string;
  presetId: string;
  presetTitle: string;
  markdown: string;
};

const copyVariants = [
  "Compact row.",
  "This row is intentionally longer and includes enough words to wrap on most desktop resolutions. It helps demonstrate how virtualization handles mixed measured heights while the window drives scroll.",
  "Medium-length example text with a second sentence so item height differs from compact rows.",
  "Very long row copy: when this row renders, it should span multiple lines even on large monitors because the sentence keeps going with descriptive details about window scrolling, list measurement, and stable positioning during rapid wheel movement.",
  "Another short row.",
  "Long variant with punctuation and structure. First, it adds detail. Second, it continues with additional context about list behavior under dynamic content. Third, it closes with one more sentence to force a clearly taller cell.",
];

export type SimpleItem = { id: string; text: string };

export const generateItems = (count: number, startIndex = 0): SimpleItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: String(startIndex + i),
    text: copyVariants[i % copyVariants.length] as string,
  }));

const MARKDOWN_OVERFLOW_GUARDS =
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto";

const LARGE_CODEBLOCK_LINES = 280;
const RANDOM_SEED = 73;

const MARKDOWN_PRESETS = buildMarkdownPresets();

function WindowScrollExample() {
  // const data = useMemo(() => generateItems(220), []);
  const data = useMemo(() => buildMarkdownItems(200, RANDOM_SEED), []);
  const listRef = useRef<LegendListRef | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [_, rerender] = useState(0);

  // HACK scroll to bottom with something weird I found
  // const HACKED_scrollAtEnd = useCallback(() => {
  //   listRef.current?.getNativeScrollRef().scrollToEnd({ animated: true });
  // }, []);

  // HACK we need to trigger a rerender for proper layout height calculation
  const handleLayout = useCallback(() => {
    if (!isReady) rerender(Date.now());
  }, [isReady]);

  useLayoutEffect(() => {
    if (!isLoaded) return;
    listRef.current?.getNativeScrollRef().scrollToEnd({ animated: false });
    // Reaveal on next frame to avoid flicker
    const raf = requestAnimationFrame(() => setIsReady(true));
    return () => {
      cancelAnimationFrame(raf);
    };
  });

  const renderItem = useCallback(
    ({ item, index }: LegendListRenderItemProps<MarkdownItem>) => (
      <article className="mx-auto mb-4 w-full max-w-3xl rounded-xl border border-border/60 bg-background/90 p-4">
        <p className="mb-3 text-muted-foreground text-xs">
          #{index + 1} - {item.presetTitle}
        </p>
        <SmoothMarkdown
          className={cn(MARKDOWN_OVERFLOW_GUARDS)}
          consolidate={true}
          isStreaming={false}
        >
          {item.markdown}
        </SmoothMarkdown>
      </article>
    ),
    []
  );

  // const renderItem = useCallback(
  //   ({ item, index }: { item: SimpleItem; index: number }) => (
  //     <button
  //       onClick={() => setSelectedId(item.id)}
  //       style={{
  //         background: selectedId === item.id ? "#ff0000" : "#000",
  //         border: "1px solid #e2e8f0",
  //         borderRadius: 10,
  //         cursor: "pointer",
  //         display: "block",
  //         marginBottom: 8,
  //         padding: "12px 14px",
  //         textAlign: "left",
  //         width: "100%",
  //       }}
  //       type="button"
  //     >
  //       <div style={{ fontWeight: 600, marginBottom: 4 }}>
  //         Row {index} / {data.length - 1}
  //       </div>
  //       <div style={{ color: "#475569", fontSize: 14 }}>{item.text}</div>
  //     </button>
  //   ),
  //   []
  // );

  return (
    <div
      // HACK to prevent jumping scrollbar
      className={cn(
        "p-3 transition-opacity duration-200 ease-snappy",
        isReady // HACK to hide flickering
          ? "opacity-100"
          : "opacity-0"
      )}
      data-loading-window-scrollbar={isReady ? undefined : true}
    >
      <LegendList<MarkdownItem>
        // alignItemsAtEnd
        data={data}
        drawDistance={200}
        estimatedItemSize={80}
        initialScrollAtEnd
        keyExtractor={(it) => it?.id}
        onLayout={handleLayout}
        onLoad={() => setIsLoaded(true)}
        ref={listRef}
        renderItem={renderItem}
        useWindowScroll
        waitForInitialLayout={true}
      />
    </div>
  );
}

function RouteComponent() {
  // const listRef = useRef<LegendListRef | null>(null);
  // useLayoutEffect(() => {
  //   // console.log(listRef.current?.scrollToEnd());
  //   console.log("THIS IS LAYOUT EFFECT", {
  //     offset: listRef.current?.getNativeScrollRef().getCurrentScrollOffset(),
  //     rect: listRef.current?.getNativeScrollRef().getBoundingClientRect(),
  //   });

  //   // const raf = requestAnimationFrame(() => {
  //   window.scrollTo({ top: 9_999_999 });
  //   listRef.current?.getNativeScrollRef().scrollToEnd({ animated: false });
  //   // });
  //   // return () => {
  //   //   cancelAnimationFrame(raf);
  //   // };
  // }, []);

  return (
    <div className="flex grow flex-col">
      <WindowScrollExample />
    </div>
  );
}

function buildMarkdownItems(size: number, seed: number): MarkdownItem[] {
  const random = createDeterministicRandom(seed + size);

  return Array.from({ length: size }, (_, index) => {
    const preset =
      MARKDOWN_PRESETS[Math.floor(random() * MARKDOWN_PRESETS.length)];
    if (!preset) {
      throw new Error("Markdown preset selection failed");
    }

    return {
      id: `demo-md-${index}-${preset.id}`,
      markdown: preset.markdown,
      presetId: preset.id,
      presetTitle: preset.title,
    };
  });
}

function buildMarkdownPresets(): MarkdownPreset[] {
  const bigTs = createLargeCodeblock("typescript", LARGE_CODEBLOCK_LINES, "ts");
  const bigPy = createLargeCodeblock("python", LARGE_CODEBLOCK_LINES, "py");

  return [
    {
      id: "short-tip",
      title: "Short Tip",
      markdown:
        "### Quick note\n\nUse `initialScrollIndex` for deterministic first placement.\n\n- Keep keys stable\n- Keep estimates realistic",
    },
    {
      id: "short-table",
      title: "Short Table",
      markdown:
        "### Mini table\n\n| Item | Status |\n| --- | --- |\n| Scroll state | Synced |\n| Bottom button | Visible when needed |",
    },
    {
      id: "medium-mixed",
      title: "Medium Mixed",
      markdown:
        "### Mixed markdown\n\nThis block mixes inline math $f(x)=x^2$ with a quote:\n\n> Virtualization should stay smooth even when row heights vary significantly.\n\nAnd a short list:\n\n1. Render\n2. Measure\n3. Stabilize",
    },
    {
      id: "huge-ts",
      title: "Huge TypeScript Codeblock",
      markdown: `### Huge code sample (TS)\n\n${bigTs}`,
    },
    {
      id: "huge-py",
      title: "Huge Python Codeblock",
      markdown: `### Huge code sample (Python)\n\n${bigPy}`,
    },
  ];
}

function createLargeCodeblock(
  language: string,
  lineCount: number,
  prefix: string
): string {
  const lines = Array.from({ length: lineCount }, (_, lineIndex) => {
    const n = lineIndex + 1;
    return `const ${prefix}_${n.toString().padStart(3, "0")} = "line ${n}";`;
  }).join("\n");

  return `\`\`\`${language}\n${lines}\n\`\`\``;
}

function createDeterministicRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}
