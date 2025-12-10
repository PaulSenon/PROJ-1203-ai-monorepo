import { ChatInput } from "@/components/ui-custom/chat-input";
import { StickyContainer } from "../ui-custom/sticky-container";
import { ChatFeed } from "./chat-feed";

export function Chat() {
  return (
    <>
      <ChatFeed />

      <StickyContainer>
        <div className="mx-auto flex w-full max-w-2xl flex-col items-start justify-center gap-4 p-4 pb-2 md:pb-4">
          <div className="w-full">
            <ChatInput />
          </div>
        </div>
      </StickyContainer>
    </>
  );
}
