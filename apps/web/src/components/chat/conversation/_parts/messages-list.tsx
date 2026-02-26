import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import type { RefObject } from "react";
import type { WindowVirtualizerHandle } from "virtua";
import { WindowVirtualizer } from "virtua";
import { ChatMessage } from "@/components/chat/message/message";
import { cn } from "@/lib/utils";

export type ConversationMessagesListProps = {
  messages: MyUIMessage[];
  shouldReserveLastAssistantSpace: boolean;
  useWindowVirtualization: boolean;
  windowVirtualizerRef?: RefObject<WindowVirtualizerHandle | null>;
};

export function ConversationMessagesList({
  messages,
  shouldReserveLastAssistantSpace,
  useWindowVirtualization,
  windowVirtualizerRef,
}: ConversationMessagesListProps) {
  const rows = messages.map((message, index) => {
    const isLast = index === messages.length - 1;
    const isAssistant = message.role === "assistant";
    const isDynamic = isLast && shouldReserveLastAssistantSpace;

    return (
      <ChatMessage
        className={cn(
          !isLast && "pb-10",
          isAssistant && isDynamic && "min-h-[calc(100vh-20rem)]"
        )}
        consolidate={!isDynamic}
        key={message.id}
        message={message}
      />
    );
  });

  if (!useWindowVirtualization) {
    return rows;
  }

  return (
    <WindowVirtualizer ref={windowVirtualizerRef} shift={false}>
      {rows}
    </WindowVirtualizer>
  );
}
