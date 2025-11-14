import { MessageSquare } from "lucide-react";
import { useEffect, useLayoutEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { useAppLoadStatusActions } from "@/hooks/use-app-load-status";
import { useActiveThreadMessages } from "@/hooks/use-chat-active";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import { ChatMessage } from "./chat-messages/chat-message";

// TODO: this is a bit hacky I think, to test again later
function ScrollInitialPosition() {
  const { scrollToBottom } = useStickToBottomContext();
  useLayoutEffect(() => {
    scrollToBottom("instant");
  }, [scrollToBottom]);

  return null;
}

export function ChatFeed() {
  const appUiStatus = useAppLoadStatusActions();
  const { messages, isPending } = useActiveThreadMessages();

  // TODO: effect or layout effect ?
  useEffect(() => {
    appUiStatus.setActiveThreadUIReady(!isPending);
  }, [isPending, appUiStatus.setActiveThreadUIReady]);

  return (
    <div>
      <Conversation className="relative w-full" style={{ height: "500px" }}>
        <ConversationContent>
          {!isPending && messages.length === 0 ? (
            <ConversationEmptyState
              description="Start a conversation to see messages here"
              icon={<MessageSquare className="size-12" />}
              title="No messages yet"
            />
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                className="animate-subtle-slide-up"
                key={message.id}
                message={message}
                style={{
                  // TODO: translate-y is messing up with scroll container and it glitches. Then hack here it's to start the first animation 100ms later but this is not a good solution.
                  animationDelay: `${100 + (messages.length - 1 - index) * 15}ms`,
                }}
              />
            ))
          )}
          {messages.length > 0 && <ScrollInitialPosition />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}
