import { useCallback, useRef } from "react";
import {
  useActiveThreadMessages,
  useActiveThreadState,
} from "@/hooks/use-chat-active";
import { useMessageIds } from "@/hooks/use-message-store";
import { ChatConversationLayout } from "./conversation-layout";

const LOAD_OLDER_PAGE_SIZE = 20;

export function ChatConversation() {
  const { uuid, isThreadSettled, pendingAutoScrollMessageId, isDataPending } =
    useActiveThreadState();
  const { loadOlder, olderHistoryStatus } = useActiveThreadMessages();
  const messageIds = useMessageIds();

  const olderHistoryStatusRef = useRef(olderHistoryStatus);
  olderHistoryStatusRef.current = olderHistoryStatus;

  const handleStartReached = useCallback(() => {
    if (olderHistoryStatusRef.current !== "CanLoadMore") return;

    loadOlder(LOAD_OLDER_PAGE_SIZE);
  }, [loadOlder]);

  return (
    <ChatConversationLayout
      isPending={isDataPending}
      isThreadSettled={isThreadSettled}
      key={uuid}
      messageIds={messageIds}
      onStartReached={handleStartReached}
      pendingAutoScrollMessageId={pendingAutoScrollMessageId}
      threadUuid={uuid}
    />
  );
}
