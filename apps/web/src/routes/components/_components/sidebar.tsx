import type { Doc } from "@ai-monorepo/convex/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import React, { useRef } from "react";
import { UserProfileButton } from "@/components/auth/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { CollapsibleButtonGroup } from "@/components/ui-custom/button-group-collapsible";
import { ChatInput } from "@/components/ui-custom/chat-input";
import { SidebarChatLink } from "@/components/ui-custom/sidebar-thread-item";
import { StickyContainer } from "@/components/ui-custom/sticky-container";
import {
  ScrollEdgeProbe,
  useScrollEdges,
} from "@/hooks/utils/use-scroll-edges";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/components/_components/sidebar")({
  component: RouteComponent,
});

function MySidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex w-full flex-1 flex-col bg-background",
        "transition-border transition-margin duration-(--duration-fast) ease-(--ease-default) md:peer-data-[variant=inset]:peer-data-[state=collapsed]:my-0 md:peer-data-[variant=inset]:peer-data-[state=collapsed]:rounded-none md:peer-data-[variant=inset]:my-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-s-xl",
        className
      )}
      data-slot="sidebar-inset"
      {...props}
    />
  );
}

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

function BetterBackdropBlur({
  position,
  className,
  thickness = "3px",
  visible = true,
}: {
  position: "top" | "bottom";
  fadeSize?: string;
  className?: string;
  thickness?: string;
  visible?: boolean;
}) {
  return (
    <>
      {/* background color */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 h-full max-h-screen bg-sidebar transition-opacity duration-(--duration-fast) ease-(--ease-default)",
          position === "top" && "top-0",
          position === "bottom" && "bottom-0",
          visible ? "opacity-0" : "opacity-100",
          className
        )}
      />
      {/* bleeding backdrop blur */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 h-[200%] max-h-screen contrast-more saturate-200 backdrop-blur-lg",
          position === "top" && "top-0",
          position === "bottom" && "bottom-0",
          visible ? "opacity-100" : "opacity-0",
          className
        )}
        style={
          {
            maskImage: `linear-gradient(to ${position === "top" ? "bottom" : "top"},black 0,black 50%,transparent 50%)`,
          } as React.CSSProperties
        }
      />

      {/* glass edge */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 m-0 h-0 p-0",
          position === "top" && "bottom-0",
          position === "bottom" && "top-0"
          // ,"h-[3px] bg-red-500/50"
        )}
        style={
          {
            "--thickness": thickness,
          } as React.CSSProperties
        }
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 h-[200px] max-h-screen brightness-100 saturate-200 backdrop-blur-md transition-all duration-(--duration-fast) ease-(--ease-default)",
            visible ? "opacity-100 brightness-150" : "opacity-0 brightness-100",
            position === "top" && "top-0",
            position === "bottom" && "bottom-0"
          )}
          style={
            {
              "--thickness": thickness,
              maskImage: `linear-gradient(to ${position === "top" ? "bottom" : "top"},black 0,black var(--thickness),transparent var(--thickness)), linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)`,
              WebkitMaskImage: `linear-gradient(to ${position === "top" ? "bottom" : "top"},black 0,black var(--thickness),transparent var(--thickness)), linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)`,
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            } as React.CSSProperties
          }
        />
      </div>
      {/* fade mask */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 left-0 m-0 h-full max-h-8 p-0",
          position === "top" && "top-0",
          position === "bottom" && "bottom-0"
          // ,"bg-red-500/50"
        )}
        style={
          {
            background: `linear-gradient(
              to ${position === "top" ? "bottom" : "top"},
              color-mix(in srgb, var(--sidebar) 100%, transparent) 0%,
              color-mix(in srgb, var(--sidebar) 90%, transparent) 30%,
              color-mix(in srgb, var(--sidebar) 50%, transparent) 70%,
              transparent 100%
            )`,
          } as React.CSSProperties
        }
      />
    </>
  );
}

/**
 * Put this inside a scroll container if you need to bump z-index of the scrollbar.
 * Because scrollbar z-index is always the max z-index of the container.
 * But you might want to bump the z-index of the scrollbar to be higher than the container.
 * (e.g. you have some fixed elements covering the scrollbar)
 * So this basically create a dummy element with the desired z-index to bump the scrollbar z-index.
 *
 * @example
 * ```tsx
 * // this header must appear on top of EVERY items inside the scroll container
 * // including the fixed button, but must remain underneath the scrollbar z-index
 * <div className="fixed bottom-0 right-0 z-20">
 *   <h2> Header </h2>
 * </div>
 *
 * <div className="overflow-scroll">
 *   // this dummy element will bump the scrollbar z-index to 30 while keeping the button
 *   // z-index underneath our header z-index
 *   <ScrollbarZIndexHack zIndex={30} />
 *
 *   <div className="h-100">
 *     <p>Hello</p>
 *     <p>World</p>
 *     // this button must appear on top of items inside the scroll container
 *     <button className="fixed bottom-0 right-0 z-10">Click me</button>
 *   </div>
 * </div>
 * ```
 */
export function ScrollbarZIndexHack({ zIndex }: { zIndex: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none h-0 opacity-0")}
      style={{ zIndex }}
    />
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
    <SidebarHeader className={className}>
      <BetterBackdropBlur
        position="top"
        thickness="1px"
        visible={isOverflowing}
      />
      <div className="z-10 mt-2 min-h-8">
        <h2 className="h-full content-center text-center font-semibold text-lg">
          Navigation
        </h2>
      </div>
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
    <SidebarFooter className={className}>
      <BetterBackdropBlur
        position="bottom"
        thickness="1px"
        visible={isOverflowing}
      />
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
/**
 * For when you need to reserve space of an element without hardcoding a spacer.
 * You wrap your component again with this and you get the same layout footprint,
 * with the same layout behavior of your component. So it makes harder to forget to
 * update a spacer when you change the layout of your component.
 *
 * We use visibility: hidden to hint the browser to skip rendering the element.
 * (only compute the layout (position/spacing), not the rendering (visual))
 *
 * @example
 * ```tsx
 * <div></div>
 *   <MyComponent className="fixed top-0"/>
 *   <SpacerFrom><MyComponent /></SpacerFrom>
 *   <div>
 *     <p>Hello</p>
 *     <p>World</p>
 *   </div>
 * </div>
 *
 * ```
 */
function SpacerFrom({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none invisible"
      role="presentation"
    >
      {children}
    </div>
  );
}

function RouteComponent() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const { isAtTop, isAtBottom, topRef, bottomRef } =
    useScrollEdges(viewportRef);
  return (
    <SidebarProvider
      style={
        {
          "--duration-base": "200ms",
          // "--ease-default": "ease-out",
        } as React.CSSProperties
      }
    >
      <Sidebar className="p-0" variant="inset">
        <MySidebarHeader
          className="absolute top-0 z-50 w-full"
          isOverflowing={!isAtTop}
        />
        <SidebarContent
          className="gap-0 overscroll-contain p-0"
          ref={viewportRef}
        >
          <ScrollEdgeProbe ref={topRef} />
          <MySidebarHeaderSpacer />
          <ScrollbarZIndexHack zIndex={51} />
          <SidebarGroup className="px-2">
            <SidebarGroupLabel>Previous Chats</SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="gap-1.5">
                {threads.map((thread) => (
                  <SidebarChatLink
                    // endIcon={<MoreVerticalIcon className="size-4" />}
                    key={thread._id}
                    thread={thread}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <MySidebarFooterSpacer />
          <ScrollEdgeProbe ref={bottomRef} />
        </SidebarContent>
        <MySidebarFooter
          className="absolute bottom-0 z-50 w-full"
          isOverflowing={!isAtBottom}
        />
      </Sidebar>
      <MySidebarInset>
        <Content />
      </MySidebarInset>
    </SidebarProvider>
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
