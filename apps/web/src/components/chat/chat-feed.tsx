import { useEffect } from "react";
import { useAppLoadStatusActions } from "@/hooks/use-app-load-status";
import {
  useActiveThreadMessages,
  useActiveThreadState,
} from "@/hooks/use-chat-active";
import { ScrollEdgeProbe } from "@/hooks/utils/use-scroll-edges";
import { ChatMessage } from "../ui-custom/chat/chat-message";
import {
  useScrollToBottomInit,
  useScrollToBottomState,
} from "../ui-custom/chat/hooks/use-scroll-to-bottom";
import { Conversation } from "../ui-custom/chat/primitives/conversation";

// TODO: move
function InitialScroll() {
  useScrollToBottomInit({
    enabled: true,
    target: "bottom",
  });

  return null;
}

export function ChatFeed() {
  const appUiStatus = useAppLoadStatusActions();
  const { messages, isPending } = useActiveThreadMessages();
  const { uuid } = useActiveThreadState();
  const { bottomRef } = useScrollToBottomState();

  // TODO: effect or layout effect ?
  useEffect(() => {
    appUiStatus.setActiveThreadUIReady(!isPending);
  }, [isPending, appUiStatus.setActiveThreadUIReady]);

  const initialScroll = !isPending && messages.length > 0;

  return (
    <Conversation className="relative mx-auto w-full max-w-2xl flex-1 p-6">
      <div className="flex flex-col gap-10">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      <ScrollEdgeProbe ref={bottomRef} />
      {initialScroll ? <InitialScroll key={uuid} /> : null}
    </Conversation>
  );
}
