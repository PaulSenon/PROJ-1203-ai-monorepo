import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { useMessageStateBridge } from "./use-message-state-bridge";
import { MessagesStoreProvider } from "./use-message-store";

type MessagePipelineValue = ReturnType<typeof useMessageStateBridge>;

const MessagePipelineContext = createContext<MessagePipelineValue | null>(null);

export function MessagePipelineProvider({
  children,
  threadUuid,
  resumeStreamEnabled,
}: {
  children: ReactNode;
  threadUuid: string | "skip";
  resumeStreamEnabled: boolean;
}) {
  const pipeline = useMessageStateBridge({ threadUuid, resumeStreamEnabled });

  return (
    <MessagePipelineContext.Provider value={pipeline}>
      <MessagesStoreProvider messages={pipeline.messages}>
        {children}
      </MessagesStoreProvider>
    </MessagePipelineContext.Provider>
  );
}

export function useMessagePipeline() {
  const context = useContext(MessagePipelineContext);
  if (!context) {
    throw new Error(
      "useMessagePipeline must be used within MessagePipelineProvider"
    );
  }

  return context;
}
