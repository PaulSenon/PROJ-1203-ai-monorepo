import { CheckIcon, CopyIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type BundledLanguage, codeToHtml, type ShikiTransformer } from "shiki";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ChatCodeBlockProps = ComponentProps<"div"> & {
  code: string;
  language: BundledLanguage;
  /** Show language label in header */
  showLanguage?: boolean;
  /** Show copy button in header */
  showCopy?: boolean;
  /** Make header sticky when scrolling within code */
  stickyHeader?: boolean;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Max height before scrolling (CSS value) */
  maxHeight?: string;
};

type CodeBlockContextType = {
  code: string;
};

// ============================================================================
// Context
// ============================================================================

const CodeBlockContext = createContext<CodeBlockContextType>({ code: "" });

// ============================================================================
// Syntax Highlighting
// ============================================================================

const lineNumberTransformer: ShikiTransformer = {
  name: "line-numbers",
  line(node, line) {
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
          "inline-block",
          "min-w-8",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground/50",
        ],
      },
      children: [{ type: "text", value: String(line) }],
    });
  },
};

async function highlightCode(
  code: string,
  language: BundledLanguage,
  showLineNumbers = false
) {
  const transformers: ShikiTransformer[] = showLineNumbers
    ? [lineNumberTransformer]
    : [];

  return await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: "one-light",
      transformers,
    }),
    codeToHtml(code, {
      lang: language,
      theme: "one-dark-pro",
      transformers,
    }),
  ]);
}

// ============================================================================
// Sub-components
// ============================================================================

type CopyButtonProps = ComponentProps<typeof Button> & {
  timeout?: number;
};

function CopyButton({ className, timeout = 2000, ...props }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), timeout);
    } catch {
      // Silently fail
    }
  };

  return (
    <Button
      className={cn("size-7 p-0", className)}
      onClick={copyToClipboard}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      <span className="relative size-3.5">
        <CopyIcon
          className={cn(
            "absolute inset-0 size-3.5 transition-all duration-200",
            isCopied ? "scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        />
        <CheckIcon
          className={cn(
            "absolute inset-0 size-3.5 transition-all duration-200",
            isCopied ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
        />
      </span>
      <span className="sr-only">{isCopied ? "Copied!" : "Copy code"}</span>
    </Button>
  );
}

type HeaderProps = {
  language: string;
  showLanguage: boolean;
  showCopy: boolean;
  sticky: boolean;
};

function Header({ language, showLanguage, showCopy, sticky }: HeaderProps) {
  if (!(showLanguage || showCopy)) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2",
        "border-border/50 border-b bg-muted/30",
        "text-muted-foreground text-xs",
        sticky && "sticky top-0 z-10 backdrop-blur-sm"
      )}
    >
      {showLanguage ? (
        <span className="font-medium uppercase tracking-wide">{language}</span>
      ) : (
        <span />
      )}
      {showCopy && <CopyButton />}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const ChatCodeBlock = memo(
  ({
    code,
    language,
    showLanguage = true,
    showCopy = true,
    stickyHeader = true,
    showLineNumbers = false,
    maxHeight,
    className,
    ...props
  }: ChatCodeBlockProps) => {
    const [lightHtml, setLightHtml] = useState<string>("");
    const [darkHtml, setDarkHtml] = useState<string>("");
    const mounted = useRef(false);

    useEffect(() => {
      highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
        if (!mounted.current) {
          setLightHtml(light);
          setDarkHtml(dark);
          mounted.current = true;
        }
      });

      return () => {
        mounted.current = false;
      };
    }, [code, language, showLineNumbers]);

    return (
      <CodeBlockContext.Provider value={{ code }}>
        <div
          className={cn(
            "group/code relative w-full overflow-hidden rounded-lg border",
            "bg-background text-foreground",
            className
          )}
          style={{ maxHeight }}
          {...props}
        >
          <Header
            language={language}
            showCopy={showCopy}
            showLanguage={showLanguage}
            sticky={stickyHeader}
          />
          <div className={cn("overflow-auto", maxHeight && "max-h-[inherit]")}>
            {/* Light theme */}
            <div
              className={cn(
                "dark:hidden",
                "[&>pre]:m-0 [&>pre]:bg-transparent! [&>pre]:p-4 [&>pre]:text-sm",
                "[&_code]:font-mono [&_code]:text-sm"
              )}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlighting
              dangerouslySetInnerHTML={{ __html: lightHtml }}
            />
            {/* Dark theme */}
            <div
              className={cn(
                "hidden dark:block",
                "[&>pre]:m-0 [&>pre]:bg-transparent! [&>pre]:p-4 [&>pre]:text-sm",
                "[&_code]:font-mono [&_code]:text-sm"
              )}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlighting
              dangerouslySetInnerHTML={{ __html: darkHtml }}
            />
          </div>
        </div>
      </CodeBlockContext.Provider>
    );
  }
);

ChatCodeBlock.displayName = "ChatCodeBlock";
