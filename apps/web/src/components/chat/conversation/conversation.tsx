import { useRef } from "react";
import type { WindowVirtualizerHandle } from "virtua";
import { useActiveThreadState } from "@/hooks/use-chat-active";
import { useActiveThreadUIReady } from "./_hooks/use-active-thread-ui-ready";
import { useConversationDisplayMessages } from "./_hooks/use-conversation-display-messages";
import { useScrollToBottomOnSubmit } from "./_hooks/use-scroll-to-bottom-on-submit";
import { ChatConversationLayout } from "./conversation-layout";

export function ChatConversation() {
  const { uuid, isThreadSettled, isDataPending, pendingAutoScrollMessageId } =
    useActiveThreadState();
  const messages = useConversationDisplayMessages();
  const windowVirtualizerRef = useRef<WindowVirtualizerHandle>(null);

  useActiveThreadUIReady(isDataPending);
  useScrollToBottomOnSubmit({
    pendingAutoScrollMessageId,
    messages,
    windowVirtualizerRef,
  });

  return (
    <ChatConversationLayout
      isPending={isDataPending}
      isThreadSettled={isThreadSettled}
      key={uuid}
      messages={messages}
      threadUuid={uuid}
      windowVirtualizerRef={windowVirtualizerRef}
    />
  );
}
