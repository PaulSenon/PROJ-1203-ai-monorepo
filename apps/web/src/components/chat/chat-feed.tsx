import { MessageSquare } from "lucide-react";
import { useLayoutEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { useActiveThreadMessages } from "@/hooks/use-chat-active";
import { cn } from "@/lib/utils";
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
  const { messages, isPending } = useActiveThreadMessages();
  return (
    <div className={cn(isPending && "opacity-0")}>
      <Conversation className="relative w-full" style={{ height: "500px" }}>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Start a conversation to see messages here"
              icon={<MessageSquare className="size-12" />}
              title="No messages yet"
            />
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          {messages.length > 0 && <ScrollInitialPosition />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}
