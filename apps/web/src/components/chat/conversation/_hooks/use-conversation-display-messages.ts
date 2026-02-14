import { createOptimisticStepStartMessage } from "@ai-monorepo/ai/helpers";
import { useMemo } from "react";
import {
  useActiveThreadMessages,
  useActiveThreadState,
} from "@/hooks/use-chat-active";

export function useConversationDisplayMessages() {
  const { isWaitingForFirstToken, uuid } = useActiveThreadState();
  const { messages } = useActiveThreadMessages();

  return useMemo(() => {
    if (!isWaitingForFirstToken) return messages;

    const lastUserMessageId = messages.at(-1)?.id ?? "pending";
    const optimisticAssistantShell = createOptimisticStepStartMessage(
      `assistant-shell:${uuid}:${lastUserMessageId}`
    );

    return [...messages, optimisticAssistantShell];
  }, [messages, isWaitingForFirstToken, uuid]);
}
