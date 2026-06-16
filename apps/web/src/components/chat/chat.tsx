import { AnimatePresence, motion } from "motion/react";
import React from "react";
import { ScrollToBottomButton } from "@/components/ui-custom/chat/scroll-to-bottom-button";
import { ChatSessionScope } from "../providers/4-chat-session-scope";
import {
  useScrollToBottomActions,
  useScrollToBottomState,
} from "../ui-custom/chat/hooks/use-scroll-to-bottom";
import { StickyContainer } from "../ui-custom/sticky-container";
import {
  ActiveChatSessionPool,
  type ChatSessionRendererProps,
} from "./_parts/active-chat-session";
import { ConversationReadyOverlay } from "./_parts/conversation-ready-overlay";
import { ChatConversation } from "./conversation/conversation";
import { ChatInput } from "./prompt-input/prompt-input";

// TODO: move
function ScrollToBottom() {
  const { scrollToBottom } = useScrollToBottomActions();
  const { isAtBottom } = useScrollToBottomState();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-full w-full">
      <AnimatePresence mode="sync">
        {!isAtBottom && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{
              duration: 0.18,
              ease: [0.16, 1, 0.3, 1], // matches ease-snappy
            }}
          >
            <ScrollToBottomButton
              className="pointer-events-auto mx-auto"
              onClick={() => scrollToBottom("smooth")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ChatSession = React.memo(function _ChatSession({
  isNew,
  sessionId,
}: ChatSessionRendererProps) {
  return (
    <ChatSessionScope isNew={isNew} sessionId={sessionId}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ChatConversation />
      </div>

      {/* z-2 to be above ConversationReadyOverlay */}
      <StickyContainer className="z-2">
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-start justify-center gap-4 px-4 pt-2 pb-2 md:pb-4">
          <ScrollToBottom />
          <div className="w-full">
            <ChatInput />
          </div>
        </div>
      </StickyContainer>
    </ChatSessionScope>
  );
});

export function Chat() {
  return (
    <>
      {/* ConversationReadyOverlay must be before ChatConversation (sticky>absolute hack) */}
      <ConversationReadyOverlay />
      <ActiveChatSessionPool component={ChatSession} />
    </>
  );
}
