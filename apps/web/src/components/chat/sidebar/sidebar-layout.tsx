import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import type React from "react";
import { Sidebar } from "@/components/ui-custom/sidebar/sidebar";
import { ThreadItem } from "./_parts/thread-item";

type ThreadDoc = Doc<"threads">;

type SidebarThreadRenderer = NonNullable<
  React.ComponentProps<typeof Sidebar>["renderThreadItem"]
>;

const renderThreadItem: SidebarThreadRenderer = ({
  thread,
  isActive,
  isMobile,
}) => (
  <ThreadItem.Root isActive={isActive} isMobile={isMobile} thread={thread} />
);

export function ChatSidebarLayout({
  className,
  activeThreadId,
  threads,
  children,
  onLoadMore,
  onNewChat,
}: {
  className?: string;
  activeThreadId?: string;
  threads: ThreadDoc[];
  children?: React.ReactNode;
  onLoadMore?: () => void;
  onNewChat?: () => void;
}) {
  return (
    <Sidebar
      activeThreadId={activeThreadId}
      className={className}
      onLoadMore={onLoadMore}
      onNewChat={onNewChat}
      renderThreadItem={renderThreadItem}
      threads={threads}
    >
      {children}
    </Sidebar>
  );
}
