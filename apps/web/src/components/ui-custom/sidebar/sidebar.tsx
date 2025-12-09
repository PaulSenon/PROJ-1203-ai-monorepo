import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import React, { useCallback, useRef } from "react";
import { UserProfileButton } from "@/components/auth/user-avatar";
import {
  Sidebar as BaseSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useInView } from "@/hooks/utils/use-intersection-observer";
import {
  ScrollEdgeProbe,
  useScrollEdges,
} from "@/hooks/utils/use-scroll-edges";
import { mergeRefs } from "@/lib/utils";
import { ScrollbarZIndexHack } from "../utils/scrollbar-z-index-hack";
import { SpacerFrom } from "../utils/spacer";
import { SidebarFooter } from "./primitives/sidebar-footer";
import { SidebarHeader } from "./primitives/sidebar-header";
import { SidebarInset } from "./primitives/sidebar-inset";
import { SidebarChatLink } from "./primitives/sidebar-thread-item";

export function Sidebar({
  threads,
  children,
}: {
  threads: Doc<"threads">[];
  children: React.ReactNode;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // handle scroll edges intersect for UI tweaks
  const { isAtTop, isAtBottom, topRef, bottomRef } =
    useScrollEdges(scrollContainerRef);

  // handle lazy loading
  const handleLoadMore = useCallback(() => {
    console.log("load more");
  }, []);
  const { ref: loadMoreRef } = useInView<HTMLDivElement>({
    rootRef: scrollContainerRef,
    rootMargin: "0px 0px 100px 0px",
    onEnter: handleLoadMore,
  });

  return (
    <SidebarProvider
      style={
        {
          "--duration-base": "200ms",
          // "--ease-default": "ease-out",
        } as React.CSSProperties
      }
    >
      <BaseSidebar className="p-0" variant="inset">
        <MySidebarHeader
          className="absolute top-0 z-50 w-full"
          isOverflowing={!isAtTop}
        />
        <SidebarContent
          className="gap-0 overscroll-contain p-0"
          ref={scrollContainerRef}
        >
          <ScrollEdgeProbe ref={topRef} />
          <MySidebarHeaderSpacer />
          <ScrollbarZIndexHack zIndex={51} />
          <SidebarGroup className="px-2">
            <SidebarGroupLabel>Previous Chats</SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="gap-1.5">
                {threads.map((thread) => (
                  <SidebarChatLink key={thread._id} thread={thread} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <MySidebarFooterSpacer />
          <ScrollEdgeProbe ref={mergeRefs(bottomRef, loadMoreRef)} />
        </SidebarContent>
        <MySidebarFooter
          className="absolute bottom-0 z-50 w-full"
          isOverflowing={!isAtBottom}
        />
      </BaseSidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

function MySidebarHeader({
  isOverflowing = false,
  className,
}: {
  isOverflowing?: boolean;
  className?: string;
}) {
  return (
    <SidebarHeader className={className} isOverflowing={isOverflowing}>
      <h2 className="h-full content-center text-center font-semibold text-lg">
        Navigation
      </h2>
    </SidebarHeader>
  );
}

const MySidebarHeaderSpacer = React.memo(
  ({ className }: { className?: string }) => (
    <SpacerFrom>
      <MySidebarHeader className={className} />
    </SpacerFrom>
  )
);
MySidebarHeaderSpacer.displayName = "MySidebarHeaderSpacer";

function MySidebarFooter({
  isOverflowing = false,
  className,
}: {
  isOverflowing?: boolean;
  className?: string;
}) {
  return (
    <SidebarFooter className={className} isOverflowing={isOverflowing}>
      <UserProfileButton className="z-50 px-4" />
    </SidebarFooter>
  );
}

const MySidebarFooterSpacer = React.memo(
  ({ className }: { className?: string }) => (
    <SpacerFrom>
      <MySidebarFooter className={className} />
    </SpacerFrom>
  )
);
MySidebarFooterSpacer.displayName = "MySidebarFooterSpacer";
