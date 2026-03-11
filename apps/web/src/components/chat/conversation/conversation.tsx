import { useCallback, useRef } from "react";
import { useAppReadySignalOnDoubleRafEffect } from "@/hooks/use-app-ready";
import {
  useActiveThreadMessages,
  useActiveThreadState,
} from "@/hooks/use-chat-active";
import { useConversationDisplayMessages } from "./_hooks/use-conversation-display-messages";
import { ChatConversationLayout } from "./conversation-layout";

const LOAD_OLDER_PAGE_SIZE = 20;

export function ChatConversation() {
  const { uuid, isThreadSettled, isDataPending, pendingAutoScrollMessageId } =
    useActiveThreadState();
  const { loadOlder, olderHistoryStatus } = useActiveThreadMessages();

  const olderHistoryStatusRef = useRef(olderHistoryStatus);
  olderHistoryStatusRef.current = olderHistoryStatus;

  const messages = useConversationDisplayMessages();

  useAppReadySignalOnDoubleRafEffect("conversation-layout", {
    skip: isDataPending,
  });

  const handleStartReached = useCallback(() => {
    if (olderHistoryStatusRef.current !== "CanLoadMore") return;

    loadOlder(LOAD_OLDER_PAGE_SIZE);
  }, [loadOlder]);

  return (
    <ChatConversationLayout
      isThreadSettled={isThreadSettled}
      key={uuid}
      messages={messages}
      onStartReached={handleStartReached}
      pendingAutoScrollMessageId={pendingAutoScrollMessageId}
    />
  );
}
