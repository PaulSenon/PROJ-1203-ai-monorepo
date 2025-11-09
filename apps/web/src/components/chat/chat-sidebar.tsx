"use client";

import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { MessageCircle, Plus } from "lucide-react";
import { memo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { usePreviousThreadHistoryPaginated } from "@/hooks/queries/use-chat-listing-queries";
import { useChatNav } from "@/hooks/use-chat-nav";
import { cn } from "@/lib/utils";
import { UserProfileButton } from "../auth/user-avatar";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";

export function ChatSidebar({ className }: { className?: string }) {
  const chatNav = useChatNav();
  const handleNewChat = () => chatNav.openNewChat();
  const handleClickThread = (threadUuid: string) =>
    chatNav.openExistingChat(threadUuid);
  // TODO: debug
  // const inputActions = useChatInputActions();
  // const inputState = useChatInputState();

  const history = usePreviousThreadHistoryPaginated();

  return (
    <Sidebar className={className}>
      <SidebarHeader className="space-y-3 p-4 pb-0">
        <div className="flex items-center justify-center">
          <h1 className="font-semibold text-lg tracking-tight">
            T3 Chat Clone
          </h1>
        </div>

        <Button className="w-full" onClick={handleNewChat} size="sm">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        {/* <Button className="w-full" onClick={inputActions.focus} size="sm">
          Focus Input
        </Button> */}
        {/* <Button
          className="w-full"
          disabled={inputState.isSaveDraftPending}
          onClick={inputActions.saveDraft}
          size="sm"
        >
          {inputState.isSaveDraftPending ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            "Save Draft"
          )}
        </Button> */}
        <Separator />
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 p-1 font-medium text-xs">
            Previous Threads
          </SidebarGroupLabel>

          <div className="mt-2 space-y-1">
            {/* TODO: handle more fine grained loading (for pages) */}
            {history.isPending ? (
              // Initial loading skeleton
              Array.from({ length: 20 }).map((_, i) => (
                <ThreadItemSkeleton index={i} key={i} />
              ))
            ) : history.results.length === 0 ? (
              // Empty state
              <div className="py-8 text-center text-muted-foreground">
                <MessageCircle className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm">No chats yet</p>
                <p className="text-xs">Start a new thread</p>
              </div>
            ) : (
              <>
                {/* Thread list */}
                {history.results
                  .filter((thread) => thread.lifecycleState === "active")
                  .map((thread) => (
                    <ThreadItem
                      isActive={chatNav.id === thread.uuid}
                      key={thread._id}
                      onClick={() => handleClickThread(thread.uuid)}
                      thread={thread}
                    />
                  ))}

                {/* Sentinel element for infinite scroll */}
                {/* {history.status !== 'Exhausted' && (
                  <div
                    aria-hidden="true"
                    className="h-1 w-full"
                    ref={sentinelRef}
                  />
                )} */}
              </>
            )}
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <UserProfileButton className="rounded-lg border" />
      </SidebarFooter>
    </Sidebar>
  );
}

const ThreadItem = memo(
  ({
    thread,
    isActive,
    onClick,
  }: {
    thread: Doc<"threads">;
    isActive: boolean;
    onClick: () => void;
  }) => {
    return (
      <button
        className={cn(
          "group/link relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-lg px-2 py-2 opacity-100 transition-discrete duration-250",
          "hover:bg-accent",
          isActive && "bg-accent"
        )}
        onClick={onClick}
        type="button"
      >
        <div className="relative flex w-full items-center gap-2">
          <LiveStateIndicator liveStatus={thread.liveStatus} />
          <div className="min-w-0 flex-1 pr-2">
            {thread.title ? (
              <div className="truncate text-sm">{thread.title}</div>
            ) : (
              <Skeleton className="h-5 w-3/4 bg-sidebar-border" />
            )}
          </div>

          <div className="-right-1 pointer-events-auto absolute top-0 bottom-0 z-50 flex translate-x-full items-center justify-end text-muted-foreground transition-transform group-hover/link:translate-x-0 group-hover/link:bg-accent">
            {/* Gradient overlay for smooth visual transition */}
            <div className="pointer-events-none absolute top-0 right-full bottom-0 h-full w-8 bg-linear-to-l from-accent to-transparent opacity-0 transition-opacity group-hover/link:opacity-100" />
          </div>
        </div>
      </button>
    );
  }
);

function LiveStateIndicator({
  liveStatus,
}: {
  liveStatus: Doc<"threads">["liveStatus"];
}) {
  const isVisible =
    liveStatus === "pending" ||
    liveStatus === "streaming" ||
    liveStatus === "error";

  // Wrapper for smooth transition
  return (
    <div
      className={cn(
        "flex items-center justify-center transition-all duration-300 ease-in-out",
        isVisible ? "w-3" : "w-0"
      )}
    >
      {liveStatus === "pending" || liveStatus === "streaming" ? (
        <div title="Processing...">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
        </div>
      ) : liveStatus === "error" ? (
        <div title="Error">
          <span className="relative flex h-2 w-2 rounded-full bg-red-500" />
        </div>
      ) : null}
    </div>
  );
}

function ThreadItemSkeleton({ index }: { index: number }) {
  const widthClasses = ["w-full", "w-3/4", "w-4/5", "w-full", "w-2/3"];
  const widthClass = widthClasses[index % widthClasses.length];
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2",
        "transition-colors",
        "hover:bg-accent"
      )}
    >
      <div className="min-w-0 flex-1">
        <Skeleton className={cn("h-5", widthClass)} />
      </div>
    </div>
  );
}
