import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ConversationRootProps = ComponentProps<"div">;

function ConversationRoot({ className, ...props }: ConversationRootProps) {
  return <div className={cn("flex flex-col", className)} {...props} />;
}

export type ConversationListProps = ComponentProps<"div">;

function ConversationList({ className, ...props }: ConversationListProps) {
  return <div className={cn("flex flex-col gap-10", className)} {...props} />;
}

export const Conversation = {
  Root: ConversationRoot,
  List: ConversationList,
};
