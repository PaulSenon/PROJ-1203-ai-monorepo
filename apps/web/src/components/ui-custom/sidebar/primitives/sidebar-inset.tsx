import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SidebarInset({
  className,
  children,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex w-full flex-1 flex-col bg-background",
        "md:peer-data-[variant=inset]:py-2",
        "md:peer-data-[variant=inset]:mx-0",
        "md:peer-data-[variant=inset]:peer-data-[state=collapsed]:rounded-none",
        className
      )}
      data-slot="sidebar-inset"
      {...props}
    >
      <SidebarInsetTop />
      <SidebarInsetBottom />
      {children}
    </main>
  );
}

function SidebarInsetTop({ className, ...props }: React.ComponentProps<"div">) {
  const { state } = useSidebar();
  return (
    <div
      aria-hidden="true"
      className={cn(
        "hidden md:block",
        "-mb-2 absolute inset-x-0 top-0 z-1 h-2 bg-sidebar",
        "transition-transform duration-(--duration-fast) ease-snappy",
        "md:data-[state=collapsed]:-translate-y-[200%]",
        className
      )}
      data-slot="sidebar-inset-top"
      data-state={state}
      {...props}
    >
      <div
        className={cn(
          "absolute top-0 left-0 size-4 translate-x-0 translate-y-[50%] bg-sidebar",
          "transition-transform duration-(--duration-fast) ease-snappy",
          "md:data-[state=collapsed]:invisible"
        )}
        data-state={state}
      />
      <div
        className={cn(
          "absolute top-0 left-0 size-4 translate-x-0 translate-y-[50%] rounded-tl-xl bg-background",
          "transition-transform duration-(--duration-fast) ease-snappy",
          "md:data-[state=collapsed]:rounded-tl-none",
          "md:data-[state=collapsed]:invisible"
        )}
        data-state={state}
      />
    </div>
  );
}

function SidebarInsetBottom({ className }: { className?: string }) {
  const { state } = useSidebar();
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 z-50 hidden h-6 overflow-hidden bg-transparent md:block"
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 bottom-0 h-2 bg-sidebar",
          "transition-transform duration-(--duration-fast) ease-snappy",
          "md:data-[state=collapsed]:translate-y-[200%]",
          className
        )}
        data-slot="sidebar-inset-bottom"
        data-state={state}
      >
        <div
          className={cn(
            "-translate-y-[50%] absolute bottom-0 left-0 size-4 translate-x-0 bg-sidebar",
            "transition-transform duration-(--duration-fast) ease-snappy",
            "md:data-[state=collapsed]:translate-y-0",
            "md:data-[state=collapsed]:-translate-x-[50%]"
          )}
          data-state={state}
        />
        <div
          className={cn(
            "-translate-y-[50%] absolute bottom-0 left-0 size-4 translate-x-0 rounded-bl-xl bg-background",
            "transition-transform duration-(--duration-fast) ease-snappy",
            "md:data-[state=collapsed]:translate-y-0",
            "md:data-[state=collapsed]:-translate-x-[50%]"
          )}
          data-state={state}
        />
      </div>
    </div>
  );
}
