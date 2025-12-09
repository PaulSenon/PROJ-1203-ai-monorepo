import { cn } from "@/lib/utils";

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"main">) {
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
