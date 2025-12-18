- [ ] in @convex/chat.ts, continue fixing non destructive patches (c.f. https://stack.convex.dev/argument-validation-without-repetition#handling-partial-updates and what already done for upsertThread and upsertThreadWithNewMessagesAndReturnHistory)

- [ ] in @web/src/hooks/use-chat-active.tsx, stop using manual upsert but instead call something external like (optimisticallySetAsStreaming(uuid))

- [ ] fix optimistic conflicts "chat:updateThread Retried due to write conflicts in table threads" (because of client-side optimistic upsertThread) => probably fill be fixed when 1. is done because we need this patches setup to be fully implemented

- [ ] sorting thread by update is perhaps not the best thing. We should sort by lastSentAt (when client send two ones, they should stay ordered in sent order. now it does, 1, 2, 3, update 2: 2, 1, 3, update 3: 3, 2, 1, 2 finishes triggering new updatedAt: 2, 3, 1, then 3 finishes triggering new updatedAt: 3, 2, 1. So it flicker when one finishes and not the others. Also I think user remember more the order they sent the messages, not the order the thread got updated last. Anyway we will have the "unread" feed that THIS ONE can be sorted by updatedAt)

- [ ] add background precache of all thread queries in listing. (will nee to setup preload pattern)

- [ ] little flicker on loading state on cvx paginated query cached when no cache (first log in)

- [x] noticed a little weird behavior: when switching chat, the draft from convex is stale for a short time. But should not happen because using the convex useQuery from helper lib that cache queries, still reactives in background. So once loaded it should always be fresh.Perhaps the issue comes from my useCvxQueryCached hook. To quickly test, we could just use useQuery from helpers in place of useCvxQueryCached in useChatDraftState. => **was because of useAuth issue. was not contextualized and was awaiting ensureUser from convex every time a query was rerendered (bursting the convex/helper cache)**

- [ ] login with different google account is not working (if only one google account logged in browser, then it always login to it an never reprompt the googl auth prompt with account selection)

- [ ] logged out state is broken (UI is in loading state, nothing visible)

- [ ] improve INP on sidebar contextmenu

- perhaps use this new font: https://fonts.google.com/specimen/Google+Sans+Flex

Tomorrow: Implementer demo conversation page in sidebar demo component page.

- create fake markdown data (take from \_components/messages.tsx)
- in \_components/sidebar.tsx, replace page content with demo conversation (handling initial scroll etc.)
- tweak design on mobile/browsers

Also: Implement loading states for main UI containers (content/ sidebar)

After Tomorrow:

- Implement full UI on final chat page

Problems:

- [x] mobile sidebar open 500ms lag
- [ ] sidebar add new chat button
- [ ] buttonGroup, add new chat button
- [x] sidebar set selected thread state (from url)
- [ ] sidebar plug delete thread feature
- [x] sidebar when open mobile, shouldn't set first item active.
- [~] sidebar fix reactive update (when thread state changes, it does not reflect on UI) (weird, it get fixed when reactive update from convex dashboard, then it work, but broken while never "fixed" by toggling liveStatus from convex dashboard.... Really weird behavior. Need to investigate more.)
- [ ] sidebar close on link click ( const { setOpenMobile } = useSidebar(); setOpenMobile(false);)
- [ ] message footer, aligned start (even for infos)
- [ ] message thinking arrow should be right after thinking text, not aligned end.
- [ ] message footer, add retry button
- input: draft broken
- [ ] conversation: setup initial scroll bottom (current setup is not working)
- [ ] conversation: setup submit min-heigh and scroll feature
- [ ] conversation: add paginated lazy loading
- [ ] conversation: wire back the error and retry message component
- [ ] fullstack: setup userSubmittedAt and order by that in thread listing
- [ ] fullstack setup stats metadata
