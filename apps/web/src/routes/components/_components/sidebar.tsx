import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { CollapsibleButtonGroup } from "@/components/ui-custom/button-group-collapsible";
import { ChatInput } from "@/components/ui-custom/chat-input";
import { Sidebar } from "@/components/ui-custom/sidebar/sidebar";
import { StickyContainer } from "@/components/ui-custom/sticky-container";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/components/_components/sidebar")({
  component: RouteComponent,
});

const threads = [
  {
    _id: "1" as Doc<"threads">["_id"],
    _creationTime: Date.now(),
    createdAt: Date.now(),
    lifecycleState: "active",
    liveStatus: "pending",
    updatedAt: Date.now(),
    userId: "1" as Doc<"users">["_id"],
    uuid: "1",
  },
  {
    _id: "2" as Doc<"threads">["_id"],
    _creationTime: Date.now(),
    createdAt: Date.now(),
    lifecycleState: "active",
    liveStatus: "streaming",
    updatedAt: Date.now(),
    userId: "2" as Doc<"users">["_id"],
    uuid: "2",
    title:
      "This is a test title that is super long so it must end up truncated",
  },
  {
    _id: "3" as Doc<"threads">["_id"],
    _creationTime: Date.now(),
    createdAt: Date.now(),
    lifecycleState: "active",
    liveStatus: "completed",
    updatedAt: Date.now(),
    userId: "3" as Doc<"users">["_id"],
    uuid: "3",
    title:
      "This is a test title that is super long so it must end up truncated",
  },
  {
    _id: "6" as Doc<"threads">["_id"],
    _creationTime: Date.now(),
    createdAt: Date.now(),
    lifecycleState: "active",
    liveStatus: "completed",
    updatedAt: Date.now(),
    userId: "6" as Doc<"users">["_id"],
    uuid: "6",
    title: "Short title",
  },
  {
    _id: "4" as Doc<"threads">["_id"],
    _creationTime: Date.now(),
    createdAt: Date.now(),
    lifecycleState: "active",
    liveStatus: "error",
    updatedAt: Date.now(),
    userId: "4" as Doc<"users">["_id"],
    uuid: "4",
    title:
      "This is a test title that is super long so it must end up truncated",
  },
  {
    _id: "5" as Doc<"threads">["_id"],
    _creationTime: Date.now(),
    createdAt: Date.now(),
    lifecycleState: "active",
    liveStatus: "cancelled",
    updatedAt: Date.now(),
    userId: "5" as Doc<"users">["_id"],
    uuid: "5",
    title:
      "This is a test title that is super long so it must end up truncated",
  },
  ...Array.from({ length: 20 }).map((_, i) => ({
    _id: `${i + 6}` as Doc<"threads">["_id"],
    _creationTime: Date.now(),
    createdAt: Date.now(),
    lifecycleState: "active" as const,
    liveStatus: "completed" as const,
    updatedAt: Date.now(),
    userId: "7" as Doc<"users">["_id"],
    uuid: `${i + 6}`,
    title: `Thread ${i + 6}`,
  })),
] satisfies Doc<"threads">[];

function RouteComponent() {
  return (
    <Sidebar threads={threads}>
      <Content />
    </Sidebar>
  );
}

function CollapsibleButtonGroupAnimated({
  ...props
}: React.ComponentProps<typeof CollapsibleButtonGroup>) {
  const { open, isMobile } = useSidebar();
  const isDesktop = !isMobile;
  const isButtonGroupCollapsed = isDesktop && open;

  return (
    <CollapsibleButtonGroup
      {...props}
      className={cn(
        "pointer-events-auto z-50 flex origin-left items-center gap-0.5 overflow-hidden rounded-sm bg-foreground/5 p-1 backdrop-blur-xs",
        props.className
      )}
      collapsed={isButtonGroupCollapsed}
    >
      <SidebarTrigger className="size-8" />
      <CollapsibleButtonGroup.CollapsibleContent>
        <Button className="size-8" variant="ghost">
          1
        </Button>
        <Button className="size-8" variant="ghost">
          2
        </Button>
      </CollapsibleButtonGroup.CollapsibleContent>
    </CollapsibleButtonGroup>
  );
}

function Content() {
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";
  return (
    <>
      <CollapsibleButtonGroupAnimated className="fixed top-3 top-safe-offset-2 left-3" />
      <header
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-padding duration-(--duration-fast) ease-(--ease-default)",
          isCollapsed ? "pl-33" : ""
        )}
      >
        <h1 className="font-semibold text-lg">Sidebar Component Demo</h1>
      </header>
      <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-4 p-6">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-2 font-semibold text-xl">Sidebar Component</h2>
          <p className="text-muted-foreground">
            This is a demo of the shadcn sidebar component. Use the trigger
            button in the header to toggle the sidebar, or press the keyboard
            shortcut.
          </p>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <p className="mb-4 last:mb-0" key={i}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam
            vehicula dolor et velit facilisis, non dictum felis maximus. Mauris
            malesuada, ex in commodo tristique, turpis erat mattis erat, in
            hendrerit justo mi id sapien. Proin laoreet metus leo, nec fermentum
            nulla ligula eget elit. Vivamus tincidunt orci mi, ut interdum elit
            tincidunt at. Fusce sed viverra sapien. Donec pellentesque pulvinar
            orci, nec lobortis purus tempor non. Pellentesque tincidunt
            facilisis massa, et ullamcorper orci dictum sed. Vestibulum ante
            ipsum primis in faucibus orci luctus et ultrices posuere cubilia
            curae.
          </p>
        ))}
      </div>
      <StickyContainer>
        <div className="mx-auto flex w-full max-w-2xl flex-col items-start justify-center gap-4 p-4 pb-2 md:pb-4">
          <CollapsibleButtonGroupAnimated className="md:hidden" />
          <div className="w-full">
            <ChatInput />
          </div>
        </div>
      </StickyContainer>
    </>
  );
}
