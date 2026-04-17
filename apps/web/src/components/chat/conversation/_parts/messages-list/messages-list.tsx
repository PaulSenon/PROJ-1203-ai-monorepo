import { memo, useEffect } from "react";
import { MessagesListEmpty } from "./_parts/messages-list-empty";
import {
  MessagesListVirtual,
  type MessagesListVirtualProps,
} from "./_parts/messages-list-virtual";

interface MessagesListProps extends MessagesListVirtualProps {
  isPending: boolean;
  onReady?: () => void;
}

export const MessagesList = memo(function _MessagesList({
  isPending,
  onReady,
  messageIds,
  ...props
}: MessagesListProps) {
  const isEmpty = !isPending && messageIds.length === 0;

  // Handle ready event signal for empty list only.
  // When list not empty the ready signal is sync with layout logic.
  useEffect(() => {
    if (!isEmpty) return;
    onReady?.();
  }, [isEmpty, onReady]);

  if (isEmpty) return <MessagesListEmpty />;

  return (
    <MessagesListVirtual
      messageIds={messageIds}
      onLayoutReady={onReady}
      {...props}
    />
  );
});
