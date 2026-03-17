export function createOptimisticAssistantMessageId({
  threadUuid,
  lastUserMessageId,
}: {
  threadUuid: string;
  lastUserMessageId: string;
}) {
  return `assistant-shell:${threadUuid}:${lastUserMessageId}`;
}
// TODO: might want to delete this now that we generate the optimistic shell on client side
// export function useConversationDisplayMessages() {
//   const { uuid, isWaitingForFirstToken } = useActiveThreadState();
//   const { messages } = useActiveThreadMessages();

//   return useMemo(() => {
//     if (!isWaitingForFirstToken) return messages;
//     const lastMessageId = messages.at(-1)?.id;
//     if (lastMessageId === undefined) return messages;
//     const optimisticId = createOptimisticAssistantMessageId({
//       threadUuid: uuid,
//       lastUserMessageId: lastMessageId,
//     });
//     const optimisticAssistantShell =
//       createOptimisticStepStartMessage(optimisticId);
//     return [...messages, optimisticAssistantShell];
//   }, [isWaitingForFirstToken, messages, uuid]);
// }
