import { useEffect, useLayoutEffect } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { useAppLoadStatusActions } from "@/hooks/use-app-load-status";
import { useActiveThreadMessages } from "@/hooks/use-chat-active";
import { ChatMessage } from "../ui-custom/chat/chat-message";
import { Conversation } from "../ui-custom/chat/primitives/conversation";

// TODO: this is a bit hacky I think, to test again later
function ScrollInitialPosition() {
  const { scrollToBottom } = useStickToBottomContext();
  useLayoutEffect(() => {
    console.log("ScrollInitialPosition");
    scrollToBottom("instant");
  }, [scrollToBottom]);

  return null;
}

export function ChatFeed() {
  const appUiStatus = useAppLoadStatusActions();
  const { messages, isPending, isStale } = useActiveThreadMessages();

  // TODO: effect or layout effect ?
  useEffect(() => {
    appUiStatus.setActiveThreadUIReady(!isPending);
  }, [isPending, appUiStatus.setActiveThreadUIReady]);

  // const { isAtBottom, scrollToBottom } = useScrollToBottom();
  // useInitialScroll({
  //   to: "bottom",
  //   enabled: messages.length > 0,
  // });

  return (
    <Conversation className="relative mx-auto min-h-screen w-full max-w-2xl gap-10 p-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {/* <ScrollToBottomButton
        className="absolute right-6 bottom-6"
        isAtBottom={isAtBottom}
        onScrollToBottom={() => scrollToBottom("smooth")}
      /> */}
    </Conversation>
  );
  // return (
  //   <div>
  //     <Conversation className="relative h-[calc(100vh-200px)] w-full">
  //       <ConversationContent className="mt-20 mb-20">
  //         {!isPending && messages.length === 0 ? (
  //           <ConversationEmptyState
  //             description="Start a conversation to see messages here"
  //             icon={<MessageSquare className="size-12" />}
  //             title="No messages yet"
  //           />
  //         ) : (
  //           messages.map((message, _index) => (
  //             <ChatMessage
  //               className={cn(
  //                 isStale ? "opacity-75" : ""
  //                 // messages.length - 1 - index <= 5
  //                 //   ? "animate-subtle-slide-up"
  //                 //   : ""
  //               )}
  //               key={message.id}
  //               message={message}
  //               // style={{
  //               //   // TODO: translate-y is messing up with scroll container and it glitches. Then hack here it's to start the first animation 100ms later but this is not a good solution.
  //               //   animationDelay:
  //               //     messages.length - 1 - index <= 5
  //               //       ? `${(messages.length - 1 - index) * 15}ms`
  //               //       : undefined,
  //               // }}
  //             />
  //           ))
  //         )}
  //         {messages.length > 0 && <ScrollInitialPosition />}
  //       </ConversationContent>
  //       <ConversationScrollButton />
  //     </Conversation>
  //   </div>
  // );
}
