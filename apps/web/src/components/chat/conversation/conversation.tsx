import { useCallback, useDeferredValue, useRef } from "react";
import {
  useActiveThreadMessages,
  useActiveThreadState,
} from "@/hooks/use-chat-active";
import { useChatNav } from "@/hooks/use-chat-nav";
import { useActiveThreadUIReady } from "./_hooks/use-active-thread-ui-ready";
import { useConversationDisplayMessages } from "./_hooks/use-conversation-display-messages";
import { ChatConversationLayout } from "./conversation-layout";

const LOAD_OLDER_PAGE_SIZE = 20;

export function ChatConversation() {
  const chatNav = useChatNav();
  const { isThreadSettled, isDataPending, pendingAutoScrollMessageId } =
    useActiveThreadState();
  const { loadOlder, olderHistoryStatus } = useActiveThreadMessages();

  const olderHistoryStatusRef = useRef(olderHistoryStatus);
  olderHistoryStatusRef.current = olderHistoryStatus;

  const messages = useConversationDisplayMessages();
  const activeThreadKey = chatNav.isNew ? "__new__" : chatNav.id;
  const deferredThreadKey = useDeferredValue(activeThreadKey);
  const isSwitching = activeThreadKey !== deferredThreadKey;

  useActiveThreadUIReady(isDataPending);

  const handleStartReached = useCallback(() => {
    if (olderHistoryStatusRef.current !== "CanLoadMore") return;

    loadOlder(LOAD_OLDER_PAGE_SIZE);
  }, [loadOlder]);

  if (isSwitching) {
    return (
      <ChatConversationLayout
        isThreadSettled={isThreadSettled}
        key={deferredThreadKey}
        messages={[]}
        onStartReached={handleStartReached}
        pendingAutoScrollMessageId={pendingAutoScrollMessageId}
      />
    );
  }

  return (
    <div
      className="fade-in-0 animate-in duration-150 ease-out"
      key={deferredThreadKey}
    >
      <ChatConversationLayout
        isThreadSettled={isThreadSettled}
        key={deferredThreadKey}
        messages={messages}
        onStartReached={handleStartReached}
        pendingAutoScrollMessageId={pendingAutoScrollMessageId}
      />
    </div>
  );
}
