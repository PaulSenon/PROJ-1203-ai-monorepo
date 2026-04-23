import { useCallback, useRef } from "react";
import { useActiveConversationMessageIds } from "@/hooks/chat/conversation/active-conversation-message-store";
import { useActiveConversationState } from "@/hooks/chat/conversation/active-conversation-store";
import { ChatConversationLayout } from "./conversation-layout";

const LOAD_OLDER_PAGE_SIZE = 20;

export function ChatConversation() {
  const { uuid, isThreadSettled, pendingAutoScrollMessageId, isDataPending } =
    useActiveConversationState();
  const { loadOlder, olderHistoryStatus, messageIds, getMessageSnapshot } =
    useActiveConversationMessageIds();

  const olderHistoryStatusRef = useRef(olderHistoryStatus);
  olderHistoryStatusRef.current = olderHistoryStatus;

  const handleStartReached = useCallback(() => {
    if (olderHistoryStatusRef.current !== "CanLoadMore") return;

    loadOlder(LOAD_OLDER_PAGE_SIZE);
  }, [loadOlder]);

  return (
    <ChatConversationLayout
      getMessageSnapshot={getMessageSnapshot}
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
