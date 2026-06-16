import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  // N.B. Important animation smoothness perf. Animate wrapping div rather than svg transform.
  // will be super smooth even when main thread is busy. Otherwise it drops frames.
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("animate-spin will-change-transform")}
    >
      <Loader2Icon
        className={cn("size-4", className)}
        {...props}
      />
    </div>
  )
}

export { Spinner }
