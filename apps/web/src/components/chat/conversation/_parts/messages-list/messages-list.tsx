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
  messages,
  ...props
}: MessagesListProps) {
  const isEmpty = !isPending && messages.length === 0;

  // Handle ready event signal for empty list only.
  // When list not empty the ready signal is sync with layout logic.
  useEffect(() => {
    if (!isEmpty) return;
    onReady?.();
  }, [isEmpty, onReady]);

  if (isEmpty) return <MessagesListEmpty />;

  return (
    <MessagesListVirtual
      messages={messages}
      onLayoutReady={onReady}
      {...props}
    />
  );
});
