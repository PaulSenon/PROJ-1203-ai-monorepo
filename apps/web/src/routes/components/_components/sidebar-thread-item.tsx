import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ThreadItem } from "@/components/chat/sidebar/_parts/thread-item";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarMenu } from "@/components/ui/sidebar";

export const Route = createFileRoute(
  "/components/_components/sidebar-thread-item"
)({
  component: RouteComponent,
});

const LIVE_STATUSES: Doc<"threads">["liveStatus"][] = [
  "pending",
  "streaming",
  "completed",
  "error",
  "cancelled",
];

const ROW_COUNT_PRESETS = [20, 200, 1000] as const;
const DEFAULT_ROW_COUNT = 200;
const DEFAULT_ACTIVE_UUID = "demo-thread-2";
const UNTITLED_EVERY_NTH = 6;
const LONG_TITLE_EVERY_NTH = 4;
const MAX_ACTION_LOG_ENTRIES = 8;

function makeThreadTitle(index: number) {
  if (index % UNTITLED_EVERY_NTH === 0) {
    return undefined;
  }
  if (index % LONG_TITLE_EVERY_NTH === 0) {
    return `Long title ${index}: This row intentionally uses a long title to validate truncation behavior in item layout.`;
  }
  return `Thread ${index}`;
}

function makeThread(index: number): Doc<"threads"> {
  const now = Date.now();
  const liveStatus = LIVE_STATUSES[index % LIVE_STATUSES.length] ?? "completed";
  return {
    _id: `demo-${index}` as Doc<"threads">["_id"],
    _creationTime: now,
    createdAt: now,
    lifecycleState: "active",
    liveStatus,
    updatedAt: now,
    userId: "demo-user" as Doc<"users">["_id"],
    uuid: `demo-thread-${index}`,
    title: makeThreadTitle(index),
  };
}

function RouteComponent() {
  const [count, setCount] = useState(DEFAULT_ROW_COUNT);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [activeUuid, setActiveUuid] = useState(DEFAULT_ACTIVE_UUID);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const threads = useMemo(
    () => Array.from({ length: count }, (_, index) => makeThread(index + 1)),
    [count]
  );

  const appendLog = (eventName: string, thread: Doc<"threads">) => {
    setActionLog((previous) =>
      [
        `${eventName}: ${thread.uuid} (${thread.title ?? "untitled"})`,
        ...previous,
      ].slice(0, MAX_ACTION_LOG_ENTRIES)
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Thread Item Demo</CardTitle>
          <CardDescription>
            Stress + interaction testbed for L3 `ThreadItem.Root` composition.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Controls</CardTitle>
            <CardDescription>
              Drive stress size, active row, preview mode, action callbacks.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Rows
              </span>
              <div className="flex gap-2">
                {ROW_COUNT_PRESETS.map((size) => (
                  <Button
                    key={size}
                    onClick={() => setCount(size)}
                    size="sm"
                    type="button"
                    variant={count === size ? "default" : "outline"}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                checked={isMobilePreview}
                className="h-4 w-4 rounded border-border"
                onChange={(event) => setIsMobilePreview(event.target.checked)}
                type="checkbox"
              />
              Render mobile item mode
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Active row UUID
              </span>
              <input
                className="rounded-md border border-border/70 bg-background px-2 py-1.5 text-sm"
                onChange={(event) => setActiveUuid(event.target.value)}
                type="text"
                value={activeUuid}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setActionLog([])}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear Action Log
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Recent actions
              </span>
              {actionLog.length === 0 ? (
                <p className="text-muted-foreground text-sm">No actions yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {actionLog.map((entry) => (
                    <li className="truncate" key={entry}>
                      {entry}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>
              Scroll long list. Use keyboard/context menu to validate parity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[560px] overflow-y-auto rounded-md border border-border/60 bg-sidebar p-2">
              <SidebarMenu className="select-none gap-1.5">
                {threads.map((thread) => (
                  <ThreadItem.Root
                    actionHandlers={{
                      onDelete: (selectedThread) =>
                        appendLog("delete", selectedThread),
                      onPin: (selectedThread) =>
                        appendLog("pin", selectedThread),
                      onRename: (selectedThread) =>
                        appendLog("rename", selectedThread),
                      onShare: (selectedThread) =>
                        appendLog("share", selectedThread),
                    }}
                    isActive={thread.uuid === activeUuid}
                    isMobile={isMobilePreview}
                    key={thread.uuid}
                    thread={thread}
                  />
                ))}
              </SidebarMenu>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
