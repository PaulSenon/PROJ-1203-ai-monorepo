"use client";

import { useCallback, useLayoutEffect, useMemo } from "react";
import { Sidebar } from "@/components/ui-custom/sidebar/sidebar";
import { usePreviousThreadHistoryPaginated } from "@/hooks/queries/use-chat-listing-queries";
import { useAppLoadStatusActions } from "@/hooks/use-app-load-status";
import { useChatNav } from "@/hooks/use-chat-nav";

export function ChatSidebar({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const appUiStatus = useAppLoadStatusActions();
  // const { isInitialUIStateReady } = useAppLoadStatus();
  const chatNav = useChatNav();
  // const handleNewChat = () => chatNav.openNewChat();
  // TODO: debug
  // const inputActions = useChatInputActions();
  // const inputState = useChatInputState();

  const history = usePreviousThreadHistoryPaginated();

  useLayoutEffect(() => {
    if (history.isPending) return;
    appUiStatus.setSidebarUIReady();
  }, [history.isPending, appUiStatus.setSidebarUIReady]);

  const handleLoadMore = useCallback(() => {
    history.loadMore(20);
  }, [history.loadMore]);

  const memoThreads = useMemo(
    () => history.results.filter((t) => t.lifecycleState === "active"),
    [JSON.stringify(history.results)]
  );

  return (
    <Sidebar
      activeThreadId={chatNav.id}
      className={className}
      onLoadMore={handleLoadMore}
      threads={memoThreads}
    >
      {children}
    </Sidebar>
  );
}

// const ThreadItem = memo(
//   ({ thread, isActive }: { thread: Doc<"threads">; isActive: boolean }) => {
//     const viewportRef = useViewportOnce<HTMLButtonElement>(thread.uuid, () => {
//       preloadThreadMetadata(thread.uuid);
//     });
//     const mouseEnterRef = useMouseEnterOnce<HTMLButtonElement>(
//       thread.uuid,
//       () => {
//         preloadThreadMessages(thread.uuid);
//       }
//     );

//     return (
//       <Link params={{ id: thread.uuid }} to="/chat/{-$id}">
//         <button
//           className={cn(
//             "group/link relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-lg px-2 py-2 opacity-100 transition-discrete duration-250",
//             "hover:bg-accent",
//             isActive && "bg-accent"
//           )}
//           ref={mergeRefs(viewportRef, mouseEnterRef)}
//           type="button"
//         >
//           <div className="relative flex w-full items-center gap-2">
//             <LiveStateIndicator liveStatus={thread.liveStatus} />
//             <div className="min-w-0 flex-1 pr-2">
//               {thread.title ? (
//                 <div className="truncate text-sm">{thread.title}</div>
//               ) : (
//                 <Skeleton className="h-5 w-3/4 bg-sidebar-border" />
//               )}
//             </div>

//             <div className="-right-1 pointer-events-auto absolute top-0 bottom-0 z-50 flex translate-x-full items-center justify-end text-muted-foreground transition-transform group-hover/link:translate-x-0 group-hover/link:bg-accent">
//               {/* Gradient overlay for smooth visual transition */}
//               <div className="pointer-events-none absolute top-0 right-full bottom-0 h-full w-8 bg-linear-to-l from-accent to-transparent opacity-0 transition-opacity group-hover/link:opacity-100" />
//             </div>
//           </div>
//         </button>
//       </Link>
//     );
//   }
// );

// function LiveStateIndicator({
//   liveStatus,
// }: {
//   liveStatus: Doc<"threads">["liveStatus"];
// }) {
//   const isVisible =
//     liveStatus === "pending" ||
//     liveStatus === "streaming" ||
//     liveStatus === "error";

//   // Wrapper for smooth transition
//   return (
//     <div
//       className={cn(
//         "flex items-center justify-center transition-all duration-300 ease-in-out",
//         isVisible ? "w-3" : "w-0"
//       )}
//     >
//       {liveStatus === "pending" || liveStatus === "streaming" ? (
//         <div title="Processing...">
//           <span className="relative flex h-2 w-2">
//             <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
//             <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
//           </span>
//         </div>
//       ) : liveStatus === "error" ? (
//         <div title="Error">
//           <span className="relative flex h-2 w-2 rounded-full bg-red-500" />
//         </div>
//       ) : null}
//     </div>
//   );
// }

// function ThreadItemSkeleton({ index }: { index: number }) {
//   const widthClasses = ["w-full", "w-3/4", "w-4/5", "w-full", "w-2/3"];
//   const widthClass = widthClasses[index % widthClasses.length];
//   return (
//     <div
//       className={cn(
//         "flex items-center gap-2 rounded-lg px-4 py-2",
//         "transition-colors",
//         "hover:bg-accent"
//       )}
//     >
//       <div className="min-w-0 flex-1">
//         <Skeleton className={cn("h-5", widthClass)} />
//       </div>
//     </div>
//   );
// }
