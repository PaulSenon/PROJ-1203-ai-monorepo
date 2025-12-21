import { AnimatePresence, motion } from "motion/react";
import { ChatInput } from "@/components/ui-custom/chat-input";
import {
  useScrollToBottomActions,
  useScrollToBottomState,
} from "../ui-custom/chat/hooks/use-scroll-to-bottom";
import { ScrollToBottomButton } from "../ui-custom/chat/primitives/scroll-to-bottom-button";
import { StickyContainer } from "../ui-custom/sticky-container";
import { ChatFeed } from "./chat-feed";

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

export function Chat() {
  return (
    <>
      <ChatFeed />
      <StickyContainer>
        <div className="relative mx-auto flex w-full max-w-2xl flex-col items-start justify-center gap-4 px-4 pt-2 pb-2 md:pb-4">
          <ScrollToBottom />
          <div className="w-full">
            <ChatInput />
          </div>
        </div>
      </StickyContainer>
    </>
  );
}
