import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ConversationProps = ComponentProps<"div">;

export function Conversation({ className, ...props }: ConversationProps) {
  return <div className={cn("flex flex-col", className)} {...props} />;
}
