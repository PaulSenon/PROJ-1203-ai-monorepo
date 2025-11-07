- [ ] in @convex/chat.ts, continue fixing non destructive patches (c.f. https://stack.convex.dev/argument-validation-without-repetition#handling-partial-updates and what already done for upsertThread and upsertThreadWithNewMessagesAndReturnHistory)

- [ ] in @web/src/hooks/use-chat-active.tsx, stop using manual upsert but instead call something external like (optimisticallySetAsStreaming(uuid))

- [ ] fix optimistic conflicts "chat:updateThread Retried due to write conflicts in table threads" (because of client-side optimistic upsertThread)
