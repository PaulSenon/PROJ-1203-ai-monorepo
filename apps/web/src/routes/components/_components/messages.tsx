import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClockIcon,
  CopyIcon,
  CpuIcon,
  RefreshCcwIcon,
  ZapIcon,
} from "lucide-react";
import { Message, MessageResponse } from "@/components/ai-elements/message";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChatMessage } from "@/components/ui-custom/chat/chat-message";
import { ChatCodeBlock } from "@/components/ui-custom/chat/primitives/code-block";
import { ChatMessageAction } from "@/components/ui-custom/chat/primitives/message-action";
import { ChatMessageActions } from "@/components/ui-custom/chat/primitives/message-actions";
import { ChatMessageContent } from "@/components/ui-custom/chat/primitives/message-content";
import { ChatMessageFooter } from "@/components/ui-custom/chat/primitives/message-footer";
import { ChatMessageInfo } from "@/components/ui-custom/chat/primitives/message-info";
import { ChatMessageInfos } from "@/components/ui-custom/chat/primitives/message-infos";
import { ThinkingBlock } from "@/components/ui-custom/chat/primitives/thinking-block";

export const Route = createFileRoute("/components/_components/messages")({
  component: RouteComponent,
});

// ============================================================================
// Demo Data
// ============================================================================

const SAMPLE_USER_TEXT = "Can you explain how React hooks work?";

const SAMPLE_ASSISTANT_TEXT = `React hooks are functions that let you "hook into" React state and lifecycle features from function components.

## Core Hooks

### useState
Manages local component state:

\`\`\`tsx
const [count, setCount] = useState(0);
\`\`\`

### useEffect
Handles side effects like data fetching, subscriptions, or DOM manipulation:

\`\`\`tsx
useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);
\`\`\`

### useContext
Accesses context values without prop drilling.

## Rules of Hooks

1. Only call hooks at the top level
2. Only call hooks from React functions`;

const SAMPLE_REASONING = `Let me think about how to explain React hooks clearly...

First, I should cover what hooks are conceptually - they're a way to use state and other React features without writing a class.

The most important hooks to cover are:
- useState for state management
- useEffect for side effects
- useContext for context consumption

I should also mention the rules of hooks since they're important for correct usage.`;

const SAMPLE_CODE_TYPESCRIPT = `import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(\`/api/users/\${userId}\`);
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, loading, error, refetch: fetchUser };
}`;

const SAMPLE_CODE_PYTHON = `from dataclasses import dataclass
from typing import Optional, List
import asyncio

@dataclass
class Message:
    role: str
    content: str
    metadata: Optional[dict] = None

class ChatAgent:
    def __init__(self, model: str = "gpt-4"):
        self.model = model
        self.messages: List[Message] = []
    
    async def chat(self, user_input: str) -> str:
        self.messages.append(Message(role="user", content=user_input))
        
        # Simulate API call
        await asyncio.sleep(0.1)
        response = f"Response to: {user_input}"
        
        self.messages.append(Message(role="assistant", content=response))
        return response
    
    def clear_history(self) -> None:
        self.messages = []`;

const EXHAUSTIVE_MARKDOWN = `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

---

## Text Formatting

This is a paragraph with **bold text**, *italic text*, and ***bold italic text***.

You can also use ~~strikethrough~~ and \`inline code\`.

Here's a [link to React docs](https://react.dev) and an autolink: https://example.com

## Lists

### Unordered List
- First item
- Second item
  - Nested item
  - Another nested
- Third item

### Ordered List
1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

### Task List
- [x] Completed task
- [ ] Incomplete task
- [ ] Another task

## Blockquotes

> This is a blockquote.
> It can span multiple lines.
>
> > And can be nested.

## Code

Inline: \`const x = 42;\`

\`\`\`typescript
interface Props {
  name: string;
  count: number;
}

function Component({ name, count }: Props) {
  return <div>{name}: {count}</div>;
}
\`\`\`

\`\`\`python
def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
\`\`\`

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Hooks | ✅ Done | Fully supported |
| Streaming | ✅ Done | With Streamdown |
| Actions | 🚧 WIP | In progress |

## Math (if supported)

Inline: $E = mc^2$

Block:
$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n
$$

## Footnotes

Here's a statement with a footnote[^1].

[^1]: This is the footnote content.

## Horizontal Rules

---

***

___`;

// ============================================================================
// Demo Helpers
// ============================================================================

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id}>
      <CardHeader>
        <Link hash={`#${id}`} to=".">
          <CardTitle># {title}</CardTitle>
        </Link>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

function DemoContainer({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </p>
      )}
      <div className="rounded-lg border bg-background p-4">{children}</div>
    </div>
  );
}

// ============================================================================
// Sample messages for ChatMessage meta component
// ============================================================================

type ExtraStats = {
  modelId?: string;
  tokensPerSec?: number;
  totalTokens?: number;
  timeToFirst?: number;
};

const baseMeta = (liveStatus: MyUIMessageMetadata["liveStatus"]) =>
  ({
    modelId: "claude-3.5-sonnet",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    liveStatus,
    lifecycleState: "active" as const,
    tokensPerSec: 45.2,
    totalTokens: 342,
    timeToFirst: 0.67,
  }) as MyUIMessage["metadata"] & ExtraStats;

const assistantCompleted: MyUIMessage = {
  id: "assistant-1",
  role: "assistant",
  parts: [{ type: "text", text: SAMPLE_ASSISTANT_TEXT }],
  metadata: baseMeta("completed"),
};

const assistantStreaming: MyUIMessage = {
  id: "assistant-2",
  role: "assistant",
  parts: [
    { type: "reasoning", text: SAMPLE_REASONING },
    { type: "text", text: "The response is still coming in..." },
  ],
  metadata: baseMeta("streaming"),
};

const assistantError: MyUIMessage = {
  id: "assistant-3",
  role: "assistant",
  parts: [{ type: "text", text: "An error occurred while processing." }],
  metadata: { ...baseMeta("error"), error: { kind: "UNKNOWN_ERROR" } },
};

const assistantCancelled: MyUIMessage = {
  id: "assistant-4",
  role: "assistant",
  parts: [{ type: "text", text: "Response was cancelled." }],
  metadata: baseMeta("cancelled"),
};

const userMessage: MyUIMessage = {
  id: "user-1",
  role: "user",
  parts: [{ type: "text", text: SAMPLE_USER_TEXT }],
  metadata: { ...baseMeta("completed"), modelId: undefined },
};

// ============================================================================
// Demo Sections
// ============================================================================

function MetaMessagesSection() {
  return (
    <Section
      description="Meta ChatMessage component: maps UIMessage to primitives with actions/infos."
      id="meta-messages"
      title="Meta Messages"
    >
      <DemoContainer label="User message">
        <ChatMessage message={userMessage} />
      </DemoContainer>

      <DemoContainer label="Assistant completed (with stats)">
        <ChatMessage
          message={assistantCompleted}
          onBranch={() => alert("Branch clicked")}
          onRetry={() => alert("Retry clicked")}
        />
      </DemoContainer>

      <DemoContainer label="Assistant streaming">
        <ChatMessage message={assistantStreaming} />
      </DemoContainer>

      <DemoContainer label="Assistant error">
        <ChatMessage message={assistantError} />
      </DemoContainer>

      <DemoContainer label="Assistant cancelled">
        <ChatMessage message={assistantCancelled} />
      </DemoContainer>
    </Section>
  );
}

function PrimitiveCompositionSection() {
  return (
    <Section
      description="Layer 1 primitives composed manually with ai-elements Message."
      id="primitives"
      title="Primitive Composition"
    >
      <DemoContainer label="Assistant message with custom footer">
        <Message from="assistant">
          <ChatMessageContent variant="assistant">
            <MessageResponse>{SAMPLE_ASSISTANT_TEXT}</MessageResponse>
          </ChatMessageContent>
          <ChatMessageFooter>
            <ChatMessageActions>
              <ChatMessageAction
                icon={<CopyIcon className="size-4" />}
                onClick={() => alert("Copy")}
                tooltip="Copy"
              />
              <ChatMessageAction
                icon={<RefreshCcwIcon className="size-4" />}
                onClick={() => alert("Retry")}
                tooltip="Retry"
              />
            </ChatMessageActions>
            <ChatMessageInfos>
              <ChatMessageInfo
                icon={<CpuIcon className="size-3" />}
                label="claude-3.5-sonnet"
              />
              <ChatMessageInfo icon={<ZapIcon className="size-3" />}>
                45.2 tok/sec
              </ChatMessageInfo>
              <ChatMessageInfo icon={<ClockIcon className="size-3" />}>
                TTFT: 0.67s
              </ChatMessageInfo>
            </ChatMessageInfos>
          </ChatMessageFooter>
        </Message>
      </DemoContainer>
    </Section>
  );
}

function ThinkingBlockSection() {
  return (
    <Section
      description="Collapsible thinking blocks, collapsed by default. User-controlled only (no auto-open/close)."
      id="thinking-blocks"
      title="Thinking Blocks"
    >
      <DemoContainer label="Collapsed (default)">
        <ThinkingBlock duration={12}>{SAMPLE_REASONING}</ThinkingBlock>
      </DemoContainer>

      <DemoContainer label="Streaming state">
        <ThinkingBlock isStreaming>{SAMPLE_REASONING}</ThinkingBlock>
      </DemoContainer>

      <DemoContainer label="Initially open">
        <ThinkingBlock defaultOpen duration={8}>
          {SAMPLE_REASONING}
        </ThinkingBlock>
      </DemoContainer>
    </Section>
  );
}

function CodeBlockSection() {
  return (
    <Section
      description="Enhanced code blocks with sticky header, language label, and copy button."
      id="code-blocks"
      title="Code Blocks"
    >
      <DemoContainer label="TypeScript with all features">
        <ChatCodeBlock
          code={SAMPLE_CODE_TYPESCRIPT}
          language="typescript"
          maxHeight="300px"
          showCopy
          showLanguage
          stickyHeader
        />
      </DemoContainer>

      <DemoContainer label="Python">
        <ChatCodeBlock
          code={SAMPLE_CODE_PYTHON}
          language="python"
          maxHeight="250px"
        />
      </DemoContainer>

      <DemoContainer label="With line numbers">
        <ChatCodeBlock
          code={`function greet(name: string) {
  console.log(\`Hello, \${name}!\`);
}

greet("World");`}
          language="typescript"
          showLineNumbers
        />
      </DemoContainer>

      <DemoContainer label="Minimal (no header)">
        <ChatCodeBlock
          code="npm install @tanstack/react-query"
          language="bash"
          showCopy={false}
          showLanguage={false}
        />
      </DemoContainer>
    </Section>
  );
}

function MarkdownDemoSection() {
  return (
    <Section
      description="Exhaustive markdown rendering test via Streamdown."
      id="markdown-demo"
      title="Full Markdown Demo"
    >
      <DemoContainer>
        <ChatMessage
          message={{
            id: "assistant-markdown",
            role: "assistant",
            parts: [{ type: "text", text: EXHAUSTIVE_MARKDOWN }],
            metadata: baseMeta("completed"),
          }}
        />
      </DemoContainer>
    </Section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function RouteComponent() {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 p-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 font-semibold text-xl">Messages UI Components</h2>
        <p className="text-muted-foreground">
          Modular message components for the chat interface. Includes
          user/assistant messages, thinking blocks, action bars, and enhanced
          code blocks.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        <Link
          className="text-primary hover:underline"
          hash="#user-messages"
          to="."
        >
          User Messages
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link
          className="text-primary hover:underline"
          hash="#assistant-messages"
          to="."
        >
          Assistant Messages
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link
          className="text-primary hover:underline"
          hash="#thinking-blocks"
          to="."
        >
          Thinking Blocks
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link
          className="text-primary hover:underline"
          hash="#code-blocks"
          to="."
        >
          Code Blocks
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link
          className="text-primary hover:underline"
          hash="#markdown-demo"
          to="."
        >
          Markdown Demo
        </Link>
      </nav>

      <div className="flex flex-col gap-8">
        <MetaMessagesSection />
        <PrimitiveCompositionSection />
        <ThinkingBlockSection />
        <CodeBlockSection />
        <MarkdownDemoSection />
      </div>
    </div>
  );
}
