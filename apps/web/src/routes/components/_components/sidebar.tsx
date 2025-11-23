import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarIcon,
  HomeIcon,
  InboxIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { CollapsibleButtonGroup } from "@/components/ui-custom/button-group-collapsible";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/components/_components/sidebar")({
  component: RouteComponent,
});

const navItems = [
  {
    title: "Home",
    url: "/",
    icon: HomeIcon,
  },
  {
    title: "Inbox",
    url: "#",
    icon: InboxIcon,
  },
  {
    title: "Calendar",
    url: "#",
    icon: CalendarIcon,
  },
  {
    title: "Search",
    url: "#",
    icon: SearchIcon,
  },
  {
    title: "Settings",
    url: "#",
    icon: SettingsIcon,
  },
];

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

function RouteComponent() {
  return (
    <SidebarProvider
      style={
        {
          "--duration-base": "200ms",
          // "--ease-default": "ease-out",
        } as React.CSSProperties
      }
    >
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="min-h-8">
            <h2 className="h-full content-center text-center font-semibold text-lg">
              Navigation
            </h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      {item.url === "/" ? (
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      ) : (
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
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
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-2 font-semibold text-xl">Sidebar Component</h2>
          <p className="text-muted-foreground">
            This is a demo of the shadcn sidebar component. Use the trigger
            button in the header to toggle the sidebar, or press the keyboard
            shortcut.
          </p>
        </div>
        <div className="grid auto-rows-min gap-4 md:grid-cols-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              className="flex aspect-video items-center justify-center rounded-xl bg-muted/50"
              key={i}
            >
              <p>Hello {i}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 flex min-h-28 w-full flex-col items-start justify-center gap-4 p-4">
        <CollapsibleButtonGroupAnimated className="md:hidden" />
        <div className="w-full bg-accent">
          <p className="text-muted-foreground">
            Placeholder text for sticky bottom container
          </p>
        </div>
      </div>
    </>
  );
}
