import type {
  MyUIMessage,
  MyUIMessageMetadata,
} from "@ai-monorepo/ai/types/uiMessage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage } from "@/components/ui-custom/chat/chat-message";
import { useInitialScroll } from "@/components/ui-custom/chat/hooks/use-initial-scroll";
import { useScrollToBottom } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";
import { Conversation } from "@/components/ui-custom/chat/primitives/conversation";
import { ScrollToBottomButton } from "@/components/ui-custom/chat/primitives/scroll-to-bottom-button";
import { UnreadDivider } from "@/components/ui-custom/chat/primitives/unread-divider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/components/_components/conversation")({
  component: RouteComponent,
});

// ============================================================================
// Demo Data
// ============================================================================

const now = Date.now();

const baseMeta = (
  liveStatus: MyUIMessageMetadata["liveStatus"]
): MyUIMessageMetadata => ({
  modelId: "claude-3.5-sonnet",
  createdAt: now,
  updatedAt: now,
  liveStatus,
  lifecycleState: "active",
});

const USER_MSG: MyUIMessage = {
  id: "msg-user",
  role: "user",
  metadata: baseMeta("completed"),
  parts: [{ type: "text", text: "React hooks vs signals?" }],
};

const ASSISTANT_LONG: MyUIMessage = {
  id: "msg-assistant-long",
  role: "assistant",
  metadata: baseMeta("completed"),
  parts: [
    {
      type: "text",
      text: `React hooks manage state and effects within React's render lifecycle. Signals provide fine-grained reactivity independent of React scheduling, often reducing re-render surfaces.

Use hooks inside React components; use signals when you need reactive primitives outside React or for finer updates.`,
    },
  ],
};

const ASSISTANT_SHORT: MyUIMessage = {
  id: "msg-assistant-short",
  role: "assistant",
  metadata: baseMeta("completed"),
  parts: [
    {
      type: "text",
      text: "Hooks are React state/effect. Signals are fine-grained reactive values.",
    },
  ],
};

const ASSISTANT_PENDING: MyUIMessage = {
  id: "msg-assistant-pending",
  role: "assistant",
  metadata: baseMeta("pending"),
  parts: [{ type: "text", text: "" }],
};

const ASSISTANT_STREAMING: MyUIMessage = {
  id: "msg-assistant-streaming",
  role: "assistant",
  metadata: baseMeta("streaming"),
  parts: [{ type: "text", text: "Streaming partial response..." }],
};

const ASSISTANT_LONG_STREAM: MyUIMessage = {
  id: "msg-assistant-long-stream",
  role: "assistant",
  metadata: baseMeta("streaming"),
  parts: [
    {
      type: "text",
      text: `Here is a much longer answer that should overflow the reserved min-height to prove the layout grows naturally. When the content exceeds the spacer, it simply continues to push and scroll.

- Point one with detail
- Point two with even more detail
- Point three with concluding remarks`,
    },
  ],
};

// ============================================================================
// Helpers
// ============================================================================

type DemoConversationProps = {
  label: string;
  children: React.ReactNode;
  initialScroll?: "bottom" | { selector: string };
  height?: string;
  startAtTop?: boolean;
};

function DemoContainer({
  label,
  children,
  initialScroll = "bottom",
  height = "320px",
  startAtTop = false,
}: DemoConversationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAtBottom, scrollToBottom } = useScrollToBottom({ containerRef });

  useInitialScroll({
    containerRef,
    to: initialScroll ?? "bottom",
    enabled: !startAtTop,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div
          className="relative overflow-y-auto rounded-md border border-border/60"
          ref={containerRef}
          style={{ height }}
        >
          <Conversation className="gap-6 p-4">{children}</Conversation>
        </div>
        <ScrollToBottomButton
          className="absolute right-6 bottom-6"
          isAtBottom={isAtBottom}
          onScrollToBottom={() => scrollToBottom("smooth")}
        />
      </CardContent>
    </Card>
  );
}

function wrapAssistantWithMinHeight(message: MyUIMessage, reserve: boolean) {
  return (
    <div
      className={cn(
        reserve && message.role === "assistant" && "min-h-[calc(100vh-200px)]"
      )}
      key={message.id}
    >
      <ChatMessage message={message} />
    </div>
  );
}

function wrapMessage(message: MyUIMessage) {
  return (
    <div key={message.id}>
      <ChatMessage message={message} />
    </div>
  );
}

// ============================================================================
// Route Component
// ============================================================================

function RouteComponent() {
  const completedMessages = useMemo(() => [USER_MSG, ASSISTANT_LONG], []);

  const pendingMessages = useMemo(() => [USER_MSG, ASSISTANT_PENDING], []);

  const streamingMessages = useMemo(() => [USER_MSG, ASSISTANT_STREAMING], []);

  const completedShortMessages = useMemo(() => [USER_MSG, ASSISTANT_SHORT], []);

  const longStreamingMessages = useMemo(
    () => [USER_MSG, ASSISTANT_LONG_STREAM],
    []
  );

  const unreadMessages = useMemo(
    () => [USER_MSG, ASSISTANT_SHORT, USER_MSG, ASSISTANT_LONG],
    []
  );

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-2">
        <h1 className="font-semibold text-2xl">Conversation</h1>
        <p className="text-muted-foreground">
          Conversation layout and scroll utilities (no internal scroll
          container).
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        <Link className="text-primary hover:underline" hash="#completed" to=".">
          Completed
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link className="text-primary hover:underline" hash="#pending" to=".">
          Pending
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link className="text-primary hover:underline" hash="#streaming" to=".">
          Streaming
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link
          className="text-primary hover:underline"
          hash="#completed-short"
          to="."
        >
          Completed Short (keeps spacer)
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link
          className="text-primary hover:underline"
          hash="#long-stream"
          to="."
        >
          Long Streaming
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link className="text-primary hover:underline" hash="#unread" to=".">
          Unread Divider
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link
          className="text-primary hover:underline"
          hash="#scroll-button"
          to="."
        >
          Scroll Button
        </Link>
      </nav>

      <div className="space-y-10">
        <section id="completed">
          <DemoContainer label="Completed (starts at bottom)">
            {completedMessages.map(wrapMessage)}
          </DemoContainer>
        </section>

        <section id="pending">
          <DemoContainer label="Pending (placeholder with min-height)">
            {pendingMessages.map((msg, i) =>
              i === pendingMessages.length - 1
                ? wrapAssistantWithMinHeight(msg, true)
                : wrapMessage(msg)
            )}
          </DemoContainer>
        </section>

        <section id="streaming">
          <DemoContainer label="Streaming (min-height reserved)">
            {streamingMessages.map((msg, i) =>
              i === streamingMessages.length - 1
                ? wrapAssistantWithMinHeight(msg, true)
                : wrapMessage(msg)
            )}
          </DemoContainer>
        </section>

        <section id="completed-short">
          <DemoContainer label="Completed short (no spacer on initial load)">
            {completedShortMessages.map(wrapMessage)}
          </DemoContainer>
        </section>

        <section id="long-stream">
          <DemoContainer label="Long streaming (overflows spacer)">
            {longStreamingMessages.map((msg, i) =>
              i === longStreamingMessages.length - 1
                ? wrapAssistantWithMinHeight(msg, true)
                : wrapMessage(msg)
            )}
          </DemoContainer>
        </section>

        <section id="unread">
          <DemoContainer
            initialScroll={{ selector: "#unread-divider" }}
            label="Unread divider (scrolls to divider)"
          >
            {unreadMessages.map((msg, i) => (
              <div className="w-full" key={`${msg.id}-${i}`}>
                <ChatMessage message={msg} />
                {i === 1 ? (
                  <UnreadDivider
                    className="mt-4"
                    count={2}
                    id="unread-divider"
                  />
                ) : null}
              </div>
            ))}
          </DemoContainer>
        </section>

        <section id="scroll-button">
          <DemoContainer
            label="Scroll button (starts away from bottom)"
            startAtTop
          >
            {completedMessages.map(wrapMessage)}
            {unreadMessages.map((msg, i) => (
              <div key={`scroll-btn-${msg.id}-${i}`}>
                <ChatMessage message={msg} />
              </div>
            ))}
          </DemoContainer>
        </section>
      </div>
    </div>
  );
}
