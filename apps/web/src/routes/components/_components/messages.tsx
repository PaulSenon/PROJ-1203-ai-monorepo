import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
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

export const Route = createFileRoute("/components/_components/messages")({
  component: RouteComponent,
});

type DemoRole = "assistant" | "user";

type DemoPart = {
  id: string;
  text: string;
};

const SAMPLE_TEXT_1 =
  "This is the first text chunk. It should render before the next part.";
const SAMPLE_TEXT_2 =
  "This is the second chunk. Ordering should be preserved across parts.";

let partCounter = 0;

const createPart = (text: string): DemoPart => ({
  id: `part-${partCounter++}`,
  text,
});

const createInitialParts = () => [
  createPart(SAMPLE_TEXT_1),
  createPart(SAMPLE_TEXT_2),
];

type PartEditorProps = {
  part: DemoPart;
  index: number;
  total: number;
  onChange: (id: string, text: string) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
};

function PartEditor({
  part,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: PartEditorProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs uppercase tracking-wide">
          Part {index + 1}
        </span>
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
      <textarea
        aria-label={`Part ${index + 1} text`}
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

  const message = useMemo<MyUIMessage>(
    () => ({
      id: "demo-message",
      role,
      parts: showEmpty
        ? []
        : parts.map((part) => ({ type: "text", text: part.text })),
    }),
    [parts, role, showEmpty]
  );

  const movePart = (from: number, to: number) => {
    setParts((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const updatePart = (id: string, text: string) => {
    setParts((prev) =>
      prev.map((part) => (part.id === id ? { ...part, text } : part))
    );
  };

  const addPart = () => {
    setParts((prev) => [...prev, createPart("")]);
  };

  const removePart = (id: string) => {
    setParts((prev) => prev.filter((part) => part.id !== id));
  };

  const resetParts = () => {
    setParts(createInitialParts());
  };

  const isAssistant = role === "assistant";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Message UI Refactor</CardTitle>
          <CardDescription>
            Text-only parts demo. Order should match the parts list.
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

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Parts
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={addPart}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Add Part
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
            <ChatMessage message={message} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
