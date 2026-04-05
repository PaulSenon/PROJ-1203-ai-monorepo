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
- [x] sidebar add new chat button
- [x] buttonGroup, add new chat button
- [x] sidebar set selected thread state (from url)
- [ ] sidebar plug delete thread feature
- [x] sidebar when open mobile, shouldn't set first item active.
- [x] sidebar fix reactive update (when thread state changes, it does not reflect on UI) (weird, it get fixed when reactive update from convex dashboard, then it work, but broken while never "fixed" by toggling liveStatus from convex dashboard.... Really weird behavior. Need to investigate more.)
      => root cause found: stale memo deps in `useCvxPaginatedQueryStable` (`use-convex-query-1-stable.ts`) dropped paginated `results` updates when `status/isLoading` unchanged after loadMore.
- [~] sidebar close on link click ( const { setOpenMobile } = useSidebar(); setOpenMobile(false);)
- [ ] message footer, aligned start (even for infos)
- [ ] message thinking arrow should be right after thinking text, not aligned end.
- [ ] message footer, add retry button
- [~] message: the last message should be shown as low opacity if stale + non settled. (done in hacky way)
- [x] input: rewire working chat input
- [ ] input: draft broken
- [x] conversation: setup initial scroll bottom (current setup is not working)
  - [ ] BUG FOUND: when complex messages (code block) the scroll to bottom is not working. Perhaps the rendering happens after the initial scroll is triggered. Need to investigate more and build something that is never dependent of rendering speed of main content. => looks like the rendering of code block is async or something. See if we can at least show a placeholder and remove all cls (check last ai-elements version just in case)
- [ ] conversation: setup submit min-heigh and scroll feature
- [ ] conversation: add paginated lazy loading
- [ ] conversation: wire back the error and retry message component
- [ ] fullstack: setup userSubmittedAt and order by that in thread listing
- [ ] fullstack setup stats metadata
- [~] fullstack: new chat: fix page rerender when submitting (not caused by scroll to bottom feature but don't know exactly what is rerendering and what is causing it.) => I think it's fixed since big refactoring of messages layers merge logic. To test.

- [ ] add noise background

```css
.bg-noise {
  background-image: url(/images/noise.png);
  background-repeat: repeat;
  background-size: 96px 96px;
}
```

```html
<div
  class="bg-noise ease-snappy absolute inset-0 -top-3.5 bg-fixed bg-bottom-right transition-transform"
></div>
```

- [ ] update all deps to latest `pnpm -r update --latest` but will broke things with alchemy update and env.ts import. So first make sure all typecheck are passing. also could be nice to scaffold another better-t-stack project with updated alchemy just to see how it shapes this up in a monorepo.

- [x] little edge case experienced on the new stream resume. Now a stream is no longer bound to a message, and when we submit message in a window and have another one open, the new submit will make the last previously stable assistant response to appear in blue (from resumed stream) and sometimes have text disappearing. I though this would be handled by use-messages hook that is supposed to merge the resumed message on top of existing by id, not overriding the last one. But perhaps we did this instead to simplify. But there here are a concrete edgecase if that the case. Because we should always to the match on message id even if we only receive one from convex stream query. And perhaps add it last only if no match, and replace if match . But never replace last assistant message without id check.
      => stream-resume regression root cause identified: stale resumed-stream local state leaked across skip<->active toggle in same mount (not message merge-by-id logic) FIXED

- [x] bug on `const paginatedMessages = usePersistedMessages(threadUuid);` in `useMessages()`, when we loadMore once, then it no longer react to tail update. e.g. to reproduce: we load a chat conversation (load last 10 items) then we trigger loadmore at least once (otherwise no bug), then we submit a new message, that should reactively update the query result with assistant shell and user message, then later update the assistant when completed, but here this does not trigger reactive update. The issue might come from paginate query implementation on convex backend ? or some convex bug ? (try upgrade both backend version and react hook), it does not seam to be some problem in convexHotCached paginated query lib as I tried to skip this and bug was still there. This bug might be linked to the "sidebar reactive update" issue above.
      => same root cause as sidebar: `useCvxPaginatedQueryStable` memoized return object without tracking `results` ref changes.

conversation issues:

- [ ] flickers when new items added and remove selection. I think this is because messages are not referentially stable. We should investigate use-messages hook to find a way to keep existing message refs and just replacing props (if that's even legal)
- [ ] virtualization (legendlist) doesn't handle big message added (e.g. this convo: http://localhost:3001/chat/wiBC1jsjB8yYgUSbkSirN) is shifts content.
      => one thing that improve that is to have further scroll space top (500vh), but this will require two things: have and aggregate of number of messages in thread metadata query, and have the first message id per thread (or just a isFirst or an index in message metadata), so we can avoid putting this space on stale data if top message is first message, while having it already there in first render if not first message. and remove it before Exhausted state when we reach message the first message. (perhaps message count aggregate per thread isn't needed after all. If we just have a message index per message, we can just read the last message index to have the number)
      => another thing is to trigger loadmore way before we reach top, but yet don't be affected by the first render (e.g. If I said I want to loadmore 200vh ahead, this should be effective only after scrolling more than the initial first 100vh.). So I guess either with updating root margin, detecting index loaded, I don't know (but I'm concerned that changing the inview rootmargins often isn't performant. So might need to research best thing to do first.). perhaps we can do something fixed like 50vh initially, then we cannot put a fixed vh size because might loadmore multiple pages at once if loaded page isn't big enough. so perhaps the calculation could be (contentHeight - vh) / 2 or be when the

- [ ] feature: paginated query cache: would be nice to have local cache for paginated query, but in a smart way so it adapts to pagination cursor. e.g. we have a paginated query loading 10 by 10, first time we get the last 10 in cache as stale, we receive 10 item but with only 8 overlapping because the remote data is ahead of 2 entries to when loading the last 10 we got two new that were not in cache. Then we can replace the 8 overlapped with fresh value and add the two new ones. When loadmore, we get THE LAST FRESH DATA as the new cursor for stale value, and we local get the next 10 values from local cache starting from this one. So while we load second page of data, we show stale item that are most likely to match next fresh data. The loadmore detector should then be placed on the last fresh item, not the last stake item. Would be nice to design somethings performant and convenient to use, like something we give a matcher function (to determine item equality between stale and fresh), a cache source ref, a paginated query result, a loadmore callback, and it returns the optimistic paginated data and states (isPending isLoading, isInitialStale, isNextPageStale, loadingStatus: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted", freshnessStatus: "Stale", "Missed", "Fresh"), and we probably need another elegant way to wire the "loadmore" callback on the last fresh item intersection obs. Don't know if we should just return the last fresh item position, or ref, or identifier, and let user wire this up. To go further, and to allow faster scroll, we could implement a preload of X cached items. Like always 20 stale item above fresh ones. So when we have new fresh items, we get more stale one rendered.

- [ ] optimization: would be nice to have initial conversation message render sync, then have any update deferred. Only this that makes sense (as we will double the rerender count because that's how deferred value works. But I think it might have a really positive impact on responsiveness while streaming, or initial conversation load rerendering when switching from stale to fresh data. Ask agent to grill me on that idea before doing anything.)
