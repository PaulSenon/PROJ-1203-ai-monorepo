import { MessageSquare } from "lucide-react";
import { useLayoutEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { useActiveThreadMessages } from "@/hooks/use-chat-active";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "../ai-elements/conversation";
import { Message, MessageContent } from "../ai-elements/message";
import { SmoothResponse } from "./smooth-response";

// TODO: this is a bit hacky I think, to test again later
function ScrollInitialPosition() {
  const { scrollToBottom } = useStickToBottomContext();
  useLayoutEffect(() => {
    scrollToBottom("instant");
  }, [scrollToBottom]);

  return null;
}

export function ChatFeed() {
  const messages = useActiveThreadMessages();
  return (
    <div>
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
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text": // we don't use any reasoning or tool calls in this example
                        return (
                          <SmoothResponse key={`${message.id}-${i}`}>
                            {part.text}
                          </SmoothResponse>
                          // <Response key={`${message.id}-${i}`}>
                          //   {part.text}
                          // </Response>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {messages.length > 0 && <ScrollInitialPosition />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}
