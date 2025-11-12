import { ChatFeed } from "./chat-feed";
import { ChatInput } from "./chat-input/chat-input";

export function Chat({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ChatFeed />
      <ChatInput />
    </div>
  );
}
