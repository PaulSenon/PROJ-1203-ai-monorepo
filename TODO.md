- [ ] in @convex/chat.ts, continue fixing non destructive patches (c.f. https://stack.convex.dev/argument-validation-without-repetition#handling-partial-updates and what already done for upsertThread and upsertThreadWithNewMessagesAndReturnHistory)

- [ ] in @web/src/hooks/use-chat-active.tsx, stop using manual upsert but instead call something external like (optimisticallySetAsStreaming(uuid))

- [ ] fix optimistic conflicts "chat:updateThread Retried due to write conflicts in table threads" (because of client-side optimistic upsertThread) => probably fill be fixed when 1. is done because we need this patches setup to be fully implemented

- [ ] sorting thread by update at is perhaps not the best thing. We should sort by lastSentAt (when client send two ones, they should stay ordered in sent order. now it does, 1, 2, 3, update 2: 2, 1, 3, update 3: 3, 2, 1, 2 finishes triggering new updatedAt: 2, 3, 1, then 3 finishes triggering new updatedAt: 3, 2, 1. So it flicker when one finishes and not the others. Also I think user remember more the order they sent the messages, not the order the thread got updated last. Anyway we will have the "unread" feed that THIS ONE can be sorted by updatedAt)

- [ ] add background precache of all thread queries in listing. (will nee to setup preload pattern)

- [ ] little flicker on loading state on cvx paginated query cached when no cache (first log in)
