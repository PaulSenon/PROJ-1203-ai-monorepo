import type { MyUIMessage } from "@ai-monorepo/ai/types/uiMessage";
import { memo, type RefObject, useEffect } from "react";
import { MessagesListEmpty } from "./_parts/messages-list-empty";
import { MessagesListPending } from "./_parts/messages-list-pending";
import {
  type EnrichedLegendListRef,
  MessagesListVirtual,
} from "./_parts/messages-list-virtual";

interface MessagesListProps {
  isPending: boolean;
  messages: MyUIMessage[];
  shouldReserveLastAssistantSpace: boolean;
  listRef: RefObject<EnrichedLegendListRef | null>;
  onStartReached?: () => void;
  // onEndReached?: () => void;
  onReady?: () => void;
}

export const MessagesList = memo(function _MessagesList({
  isPending,
  messages,
  listRef,
  shouldReserveLastAssistantSpace,
  // onEndReached,
  onStartReached,
  onReady,
}: MessagesListProps) {
  const isEmpty = !isPending && messages.length === 0;

  useEffect(() => {
    if (!isEmpty) return;
    onReady?.();
  }, [isEmpty, onReady]);

  if (isPending) return <MessagesListPending />;

  if (isEmpty) return <MessagesListEmpty />;

  return (
    <MessagesListVirtual
      listRef={listRef}
      messages={messages}
      onLayoutReady={onReady}
      onStartReached={onStartReached}
      shouldReserveLastAssistantSpace={shouldReserveLastAssistantSpace}
    />
  );
});
