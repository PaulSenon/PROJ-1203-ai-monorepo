import type { LiveStatus, MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ChatConversationLayout } from "@/components/chat/conversation/conversation-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollToBottomProvider } from "@/components/ui-custom/chat/hooks/use-scroll-to-bottom";

export const Route = createFileRoute("/components/_components/conversation")({
  component: RouteComponent,
});

const ASSISTANT_STATUSES: LiveStatus[] = [
  "pending",
  "streaming",
  "completed",
  "cancelled",
  "error",
];

let messageCounter = 0;

function nextMessageId() {
  messageCounter += 1;
  return `demo-message-${messageCounter}`;
}

function createUserMessage(text: string): MyUIMessage {
  return {
    id: nextMessageId(),
    role: "user",
    parts: [{ type: "text", text }],
  };
}

function createAssistantMessage(
  text: string,
  liveStatus: LiveStatus
): MyUIMessage {
  const now = Date.now();
  return {
    id: nextMessageId(),
    role: "assistant",
    parts: [{ type: "text", text }],
    metadata: {
      createdAt: now,
      updatedAt: now,
      lifecycleState: "active",
      liveStatus,
      modelId: "gpt-5.2-codex",
    },
  };
}

function createInitialMessages() {
  return [
    createUserMessage("How do I test conversation layout?"),
    createAssistantMessage(
      "Use controls on the left. Add messages, change status, remount layout.",
      "completed"
    ),
  ];
}

function RouteComponent() {
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<MyUIMessage[]>(
    createInitialMessages
  );
  const [isPending, setIsPending] = useState(false);
  const [isThreadSettled, setIsThreadSettled] = useState(true);
  const [threadUuid, setThreadUuid] = useState("demo-thread-1");
  const [layoutRemountKey, setLayoutRemountKey] = useState(0);

  const addUserMessage = () => {
    setMessages((prev) => [...prev, createUserMessage("New user message")]);
  };

  const addAssistantMessage = () => {
    setMessages((prev) => [
      ...prev,
      createAssistantMessage("New assistant message", "completed"),
    ]);
  };

  const resetDemo = () => {
    setMessages(createInitialMessages());
    setIsPending(false);
    setIsThreadSettled(true);
    setThreadUuid("demo-thread-1");
    setLayoutRemountKey(0);
  };

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== id));
  };

  const updateMessageText = (id: string, text: string) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== id) return message;
        return {
          ...message,
          parts: [{ type: "text", text }],
        };
      })
    );
  };

  const updateAssistantLiveStatus = (id: string, liveStatus: LiveStatus) => {
    const now = Date.now();
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== id || message.role !== "assistant") return message;
        return {
          ...message,
          metadata: {
            createdAt: message.metadata?.createdAt ?? now,
            updatedAt: now,
            lifecycleState: message.metadata?.lifecycleState ?? "active",
            liveStatus,
            modelId: message.metadata?.modelId,
            error: message.metadata?.error,
            timing: message.metadata?.timing,
            usage: message.metadata?.usage,
          },
        };
      })
    );
  };

  const bumpThreadUuid = () => {
    setThreadUuid(`demo-thread-${Date.now()}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Conversation Layout Demo</CardTitle>
          <CardDescription>
            Pure L3 layout testbed. No business hooks, only layout props.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Controls</CardTitle>
            <CardDescription>Edit current layout props only.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={isPending}
                className="h-4 w-4 rounded border-border"
                onChange={(event) => setIsPending(event.target.checked)}
                type="checkbox"
              />
              Conversation isPending
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                checked={isThreadSettled}
                className="h-4 w-4 rounded border-border"
                onChange={(event) => setIsThreadSettled(event.target.checked)}
                type="checkbox"
              />
              Thread isThreadSettled
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Thread UUID
              </span>
              <input
                className="rounded-md border border-border/70 bg-background px-2 py-1.5 text-sm"
                onChange={(event) => setThreadUuid(event.target.value)}
                type="text"
                value={threadUuid}
              />
              <Button
                onClick={bumpThreadUuid}
                size="sm"
                type="button"
                variant="outline"
              >
                New UUID
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setLayoutRemountKey((key) => key + 1)}
                size="sm"
                type="button"
                variant="outline"
              >
                Force Layout Remount
              </Button>
              <Button
                onClick={resetDemo}
                size="sm"
                type="button"
                variant="ghost"
              >
                Reset Demo
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={addUserMessage}
                size="sm"
                type="button"
                variant="outline"
              >
                Add User
              </Button>
              <Button
                onClick={addAssistantMessage}
                size="sm"
                type="button"
                variant="outline"
              >
                Add Assistant
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No messages yet.
                </p>
              ) : null}

              {messages.map((message, index) => (
                <div
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background p-3"
                  key={message.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">
                      #{index + 1} {message.role}
                    </span>
                    <Button
                      onClick={() => removeMessage(message.id)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>

                  {message.role === "assistant" ? (
                    <label className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground text-xs uppercase tracking-wide">
                        liveStatus
                      </span>
                      <select
                        className="rounded-md border border-border/70 bg-background px-2 py-1.5 text-sm"
                        onChange={(event) =>
                          updateAssistantLiveStatus(
                            message.id,
                            event.target.value as LiveStatus
                          )
                        }
                        value={message.metadata?.liveStatus ?? "completed"}
                      >
                        {ASSISTANT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <textarea
                    className="min-h-[88px] w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) =>
                      updateMessageText(message.id, event.target.value)
                    }
                    value={
                      message.parts.find((part) => part.type === "text")
                        ?.text ?? ""
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>
              Layout remount key: {layoutRemountKey}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="h-[560px] overflow-y-auto rounded-md border border-border/60 bg-background"
              ref={previewScrollRef}
            >
              <ScrollToBottomProvider containerRef={previewScrollRef}>
                <ChatConversationLayout
                  isPending={isPending}
                  isThreadSettled={isThreadSettled}
                  key={`${threadUuid}:${layoutRemountKey}`}
                  messages={messages}
                  threadUuid={threadUuid}
                  useWindowVirtualization={false}
                />
              </ScrollToBottomProvider>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
