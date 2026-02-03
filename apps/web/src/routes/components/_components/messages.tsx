import type { LiveStatus, MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChatMessage } from "@/components/chat/message/message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/components/_components/messages")({
  component: RouteComponent,
});

type DemoRole = "assistant" | "user";

type ReasoningState = "streaming" | "done";

type DemoTextPart = {
  id: string;
  type: "text";
  text: string;
};

type DemoReasoningPart = {
  id: string;
  type: "reasoning";
  text: string;
  state: ReasoningState;
};

type DemoPart = DemoTextPart | DemoReasoningPart;

const SAMPLE_TEXT_1 =
  "This is the first text chunk. It should render before the next part.";
const SAMPLE_TEXT_2 =
  "This is the second chunk. Ordering should be preserved across parts.";
const SAMPLE_REASONING_1 =
  "First, verify the order of the parts.\nThen, confirm reasoning collapses after streaming.\nFinally, ensure the toggle preserves state.";
const LONG_MARKDOWN = [
  "```ts",
  "const config = {",
  '  endpoint: "https://example.com/api/v1/streaming/super/long/path",',
  "  headers: {",
  '    \\"x-long-header-name\\": \\"this-is-a-very-long-header-value-that-should-scroll\\",',
  "  },",
  "};",
  "```",
  "",
  "| column-one | column-two | column-three | column-four | column-five | column-six |",
  "| --- | --- | --- | --- | --- | --- |",
  "| alpha | beta | gamma | delta | epsilon | zeta |",
  "| supercalifragilisticexpialidocious | very-long-value-with-no-breaks | 1234567890 | 1234567890 | 1234567890 | 1234567890 |",
].join("\n");
const STREAM_CHUNKS = [
  " Streaming chunk one.",
  " Then chunk two arrives with more content.",
  " Finally chunk three closes the stream.",
];

let partCounter = 0;

const createTextPart = (text: string): DemoTextPart => ({
  id: `part-${partCounter++}`,
  type: "text",
  text,
});

const createReasoningPart = (
  text: string,
  state: ReasoningState
): DemoReasoningPart => ({
  id: `part-${partCounter++}`,
  type: "reasoning",
  text,
  state,
});

const createInitialParts = () => {
  partCounter = 0;
  return [
    createTextPart(SAMPLE_TEXT_1),
    createReasoningPart(SAMPLE_REASONING_1, "streaming"),
    createTextPart(SAMPLE_TEXT_2),
  ];
};

type PartEditorProps = {
  part: DemoPart;
  index: number;
  total: number;
  onChange: (id: string, text: string) => void;
  onStateChange: (id: string, state: ReasoningState) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
};

function PartEditor({
  part,
  index,
  total,
  onChange,
  onStateChange,
  onMove,
  onRemove,
}: PartEditorProps) {
  const isReasoning = part.type === "reasoning";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            Part {index + 1}
          </span>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
            {part.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Up
          </Button>
          <Button
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Down
          </Button>
          <Button
            onClick={() => onRemove(part.id)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Remove
          </Button>
        </div>
      </div>
      {isReasoning ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            State
          </span>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onStateChange(part.id, "streaming")}
              size="sm"
              type="button"
              variant={part.state === "streaming" ? "default" : "outline"}
            >
              Streaming
            </Button>
            <Button
              onClick={() => onStateChange(part.id, "done")}
              size="sm"
              type="button"
              variant={part.state === "done" ? "default" : "outline"}
            >
              Done
            </Button>
          </div>
        </div>
      ) : null}
      <textarea
        aria-label={`Part ${index + 1} ${part.type} text`}
        autoComplete="off"
        className="min-h-[96px] w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        name={`part-${part.id}`}
        onChange={(event) => onChange(part.id, event.target.value)}
        value={part.text}
      />
    </div>
  );
}

function RouteComponent() {
  const [role, setRole] = useState<DemoRole>("assistant");
  const [parts, setParts] = useState<DemoPart[]>(createInitialParts);
  const [showEmpty, setShowEmpty] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isThreadStreaming, setIsThreadStreaming] = useState(false);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [streamCursor, setStreamCursor] = useState(0);
  const isAssistant = role === "assistant";
  const showEmptyMessage = isAssistant && showEmpty;

  const message = useMemo<MyUIMessage>(() => {
    const now = Date.now();
    const nowSeconds = Math.round(now / 1000);
    const errorMetadata = showError
      ? ({
          kind: "UNKNOWN_ERROR",
          message: "Something went wrong while generating the response.",
        } as const)
      : undefined;
    let liveStatus: LiveStatus;
    if (showCancelled) {
      liveStatus = "cancelled";
    } else if (showError) {
      liveStatus = "error";
    } else if (showEmptyMessage) {
      liveStatus = "pending";
    } else if (isThreadStreaming) {
      liveStatus = "streaming";
    } else {
      liveStatus = "completed";
    }
    const metadata = isAssistant
      ? {
          createdAt: now,
          updatedAt: now,
          liveStatus,
          lifecycleState: "active" as const,
          modelId: "gpt-5.2-codex",
          usage: {
            outputTokens: 512,
            totalTokens: 768,
          },
          timing: {
            userSubmittedAt: nowSeconds - 12,
            lastTokenReceivedAt: nowSeconds,
          },
          error: errorMetadata,
        }
      : undefined;

    return {
      id: "demo-message",
      role,
      metadata,
      parts: showEmptyMessage
        ? []
        : parts.map((part) =>
            part.type === "text"
              ? { type: "text", text: part.text }
              : { type: "reasoning", text: part.text, state: part.state }
          ),
    };
  }, [
    parts,
    role,
    showEmptyMessage,
    showCancelled,
    showError,
    isThreadStreaming,
    isAssistant,
  ]);

  const movePart = (from: number, to: number) => {
    setParts((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });
  };

  const updatePart = (id: string, text: string) => {
    setParts((prev) =>
      prev.map((part) => (part.id === id ? { ...part, text } : part))
    );
  };

  const updateReasoningState = (id: string, state: ReasoningState) => {
    setParts((prev) =>
      prev.map((part) =>
        part.id === id && part.type === "reasoning" ? { ...part, state } : part
      )
    );
  };

  const addTextPart = () => {
    setParts((prev) => [...prev, createTextPart("")]);
  };

  const addReasoningPart = () => {
    setParts((prev) => [...prev, createReasoningPart("", "streaming")]);
  };

  const removePart = (id: string) => {
    setParts((prev) => prev.filter((part) => part.id !== id));
  };

  const resetParts = () => {
    setParts(createInitialParts());
    setStreamCursor(0);
  };

  const appendStreamChunk = () => {
    const chunk = STREAM_CHUNKS[streamCursor];
    if (!chunk) return;

    setParts((prev) => {
      const index = prev.findIndex((part) => part.type === "text");
      if (index === -1) return prev;

      const next = [...prev];
      const part = next[index];
      if (part?.type !== "text") return prev;

      next[index] = { ...part, text: `${part.text}${chunk}` };
      return next;
    });

    setStreamCursor((value) => Math.min(value + 1, STREAM_CHUNKS.length));
  };

  const resetStream = () => {
    setStreamCursor(0);
  };

  const insertLongContent = () => {
    setParts((prev) => {
      const index = prev.findIndex((part) => part.type === "text");
      if (index === -1) return [...prev, createTextPart(LONG_MARKDOWN)];

      const next = [...prev];
      const part = next[index];
      if (part?.type !== "text") return prev;

      next[index] = { ...part, text: LONG_MARKDOWN };
      return next;
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Message UI Refactor</CardTitle>
          <CardDescription>
            Text and reasoning parts demo. Order should match the parts list.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Controls</CardTitle>
            <CardDescription>
              Build the parts list and preview it.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Role
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setRole("assistant")}
                  size="sm"
                  type="button"
                  variant={role === "assistant" ? "default" : "outline"}
                >
                  Assistant
                </Button>
                <Button
                  onClick={() => setRole("user")}
                  size="sm"
                  type="button"
                  variant={role === "user" ? "default" : "outline"}
                >
                  User
                </Button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                checked={showEmpty}
                className="h-4 w-4 rounded border-border"
                disabled={!isAssistant}
                name="empty-message"
                onChange={(event) => setShowEmpty(event.target.checked)}
                type="checkbox"
              />
              Empty message (assistant only)
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Status
              </span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={showCancelled}
                  className="h-4 w-4 rounded border-border"
                  disabled={!isAssistant}
                  name="status-cancelled"
                  onChange={(event) => setShowCancelled(event.target.checked)}
                  type="checkbox"
                />
                Cancelled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={showError}
                  className="h-4 w-4 rounded border-border"
                  disabled={!isAssistant}
                  name="status-error"
                  onChange={(event) => setShowError(event.target.checked)}
                  type="checkbox"
                />
                Error
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Footer
              </span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={isThreadStreaming}
                  className="h-4 w-4 rounded border-border"
                  name="thread-streaming"
                  onChange={(event) =>
                    setIsThreadStreaming(event.target.checked)
                  }
                  type="checkbox"
                />
                Thread streaming
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={isMobilePreview}
                  className="h-4 w-4 rounded border-border"
                  name="preview-mobile"
                  onChange={(event) => setIsMobilePreview(event.target.checked)}
                  type="checkbox"
                />
                Mobile preview
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Parts
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={addTextPart}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Add Text
                </Button>
                <Button
                  onClick={addReasoningPart}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Add Reasoning
                </Button>
                <Button
                  onClick={resetParts}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Streaming
              </span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={streamCursor >= STREAM_CHUNKS.length}
                  onClick={appendStreamChunk}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Append Chunk
                </Button>
                <Button
                  onClick={resetStream}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Reset Stream
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Overflow
              </span>
              <Button
                onClick={insertLongContent}
                size="sm"
                type="button"
                variant="outline"
              >
                Insert Long Content
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              {parts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No parts yet.</p>
              ) : null}
              {parts.map((part, index) => (
                <PartEditor
                  index={index}
                  key={part.id}
                  onChange={updatePart}
                  onMove={movePart}
                  onRemove={removePart}
                  onStateChange={updateReasoningState}
                  part={part}
                  total={parts.length}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>
              New L3 message entry + ordered parts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn("w-full", isMobilePreview && "mx-auto max-w-sm")}
            >
              <ChatMessage message={message} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
