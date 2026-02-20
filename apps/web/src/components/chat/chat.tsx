import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ScrollToBottomButton } from "@/components/ui-custom/chat/scroll-to-bottom-button";
import {
  useScrollToBottomActions,
  useScrollToBottomState,
} from "../ui-custom/chat/hooks/use-scroll-to-bottom";
import { StickyContainer } from "../ui-custom/sticky-container";
import { ChatConversation } from "./conversation/conversation";
import { ChatInput } from "./prompt-input/prompt-input";

// TODO: move
function ScrollToBottom() {
  const { isProbeVisible, scrollToBottom } = useScrollToBottomActions();
  const { isAtBottom } = useScrollToBottomState();
  const settleRafIdRef = useRef<number | null>(null);

  const clearSettleLoop = () => {
    const rafId = settleRafIdRef.current;
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    settleRafIdRef.current = null;
  };

  useEffect(() => clearSettleLoop, []);

  const scrollToBottomAfterSettle = () => {
    clearSettleLoop();
    scrollToBottom("instant");

    let remainingFrames = 24;
    let visibleFrames = 0;

    const settle = () => {
      if (isProbeVisible("bottom")) {
        visibleFrames += 1;
      } else {
        visibleFrames = 0;
        scrollToBottom("instant");
      }

      remainingFrames -= 1;
      if (visibleFrames >= 2 || remainingFrames <= 0) {
        settleRafIdRef.current = null;
        return;
      }

      settleRafIdRef.current = requestAnimationFrame(settle);
    };

    settleRafIdRef.current = requestAnimationFrame(settle);
  };

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
              onClick={scrollToBottomAfterSettle}
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
      <ChatConversation />
      <StickyContainer>
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-start justify-center gap-4 px-4 pt-2 pb-2 md:pb-4">
          <ScrollToBottom />
          <div className="w-full">
            <ChatInput />
          </div>
        </div>
      </StickyContainer>
    </>
  );
}
