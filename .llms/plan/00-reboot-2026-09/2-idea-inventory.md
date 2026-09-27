# Idea inventory

Everything found on 2026-09-27 in: `TODO.md`, `.llms/memory/*`, `.llms/plan|proj/*`, code `TODO/FIXME/HACK` comments (93 total), unmerged branches, and the chat with you.
Status: `todo` · `wip` (partial work exists) · `done?` (believed done, verify in baseline QA) · `parked` · `dropped`.
Track letters match `1-plan.md` Phase 5.

## A. Messages data layer & React perf

| status | item | source |
|---|---|---|
| wip | Messages store (ids-first, per-slice subscriptions, ref stabilization) | `3-messages-architecture.md`, 5 archived attempts |
| todo | Actions context must not depend on `messages` (`regenerate` deps) | `use-chat-active.tsx:429` |
| todo | Cache write only on meaningful tail change (not every tick) | `use-messages.tsx:436`; done on `archive/messages-2-stability` (`cache-tail.ts`) |
| todo | Debug datasource borders behind explicit flag | `message-assistant.tsx:90` |
| todo | Split assistant row: markdown depends on parts only | grill log v2 |
| todo | Idea: sync initial conversation render, defer later updates (`useDeferredValue`) — **grill before doing** | `TODO.md` "optimization" |
| todo | Single shared live-status reducer (web + api), fix `getLiveStatusKind` misuse | `use-chat-active.tsx:229,240`, `use-stream-ownership.tsx:14` |
| todo | Frame-perfect stream→persisted handoff (flush stream msgs when persisted arrives) | `use-chat-active.tsx:287` |
| todo | Proper per-request error binding (AI SDK limitation → fork/contrib useChat?) | `use-chat-active.tsx:278`, PR #11 notes |
| todo | Cancel (not implemented), queueing messages, regenerate in live path | `use-chat-active.tsx:328,342` |
| todo | Save cleared input to restore on send error | `use-chat-active.tsx:252` |
| parked | Hot/cold metadata selector policy | `archive/2-*/backlog-at-branch-end.txt` |

## B. Conversation virtualization & scroll

| status | item | source |
|---|---|---|
| wip | Conversation list on LegendList beta 47 (window scroll, initialScrollAtEnd, alignItemsAtEnd, recycleItems) | `messages-list-virtual.tsx` |
| todo | Decide virtualizer after store lands: LegendList stable vs TanStack Virtual + unvirtualized tail (t3code pattern) vs virtua | archived PRDs in `archive/virtualization-attempts/`, t3code `MessagesTimeline.tsx` |
| todo | Perfect initial anchor on open — **open decision**: last read vs last user msg vs bottom | `mental_board` OPEN_DECISIONS |
| todo | Big message added shifts content; ideas: 500vh top space + per-message index metadata / isFirst; earlier load-more trigger after first viewport | `TODO.md` conversation issues |
| done? | Reserve space above conversation when not exhausted | commit `91a9ed0` |
| done? | Scroll to bottom on submit ("snappy" mode), last-assistant min-height reserve | PR #11, `DONE-ui-last-assistant-min-height` |
| todo | Flicker + selection loss when items added (ref instability) → should vanish with A | `TODO.md` |
| todo | Complex messages (code blocks) break initial scroll-to-bottom (async render) | `TODO.md` BUG FOUND |
| todo | Remove `onLoad` safety net once beta-47 onLayout proven | `messages-list-virtual.tsx:107` |
| todo | `enableCodeHighlighting` vs isReady reactivity | `messages-list-virtual.tsx:143` |
| todo | LegendList wishlist/contribs: window-scroll initial bottom, Safari/iOS scroll-up, `getItemType` Safari bug | `messages-list-virtual.tsx:182-187` |
| todo | Idea: text height estimation (pretext) for better `estimatedItemSize` | `.llms/git-references/pretext` |
| parked | Sidebar pagination placeholder prefill | `backlog.txt` |
| todo | Idea: smart paginated-query local cache (stale pages merged with fresh by cursor, `freshnessStatus`, preload N stale items) | `TODO.md` "feature: paginated query cache" |

## C. Interaction perf (INP)

| status | item | source |
|---|---|---|
| todo | Sidebar right-click / context menu perf (INP) | `TODO.md`, sidebar QA notes, you |
| todo | Model selector perf | you |
| wip | Code block perf: worker highlighting done; WASM phase 2 parked; code block CLS contrib | `plan/wasm-worker-highlighter/*`, `plan/streamdown-codeblock-cls/*`, `backlog.txt` |
| todo | Sidebar header/footer backdrop edge-toggle lag (~500ms) | `short_term.txt` 2026-03-02 |
| todo | `thread-item.tsx` uses external hooks (should be props) | `thread-item.tsx:364,386` |
| done? | Sidebar hover + loader animations fully on compositor | PR #11 |
| todo | Look at t3code for context menu / selector patterns | reference repo |

## D. Prompt input & draft

| status | item | source |
|---|---|---|
| todo | Full prompt-input rethink (L2 primitive + L3 `_hooks`/`_parts`, perf, data flow) | `components/chat/prompt-input/TODO.md`, `TODO.md` urgent |
| todo | Draft broken; new-chat should hint (not restore) previous draft | `TODO.md`, `use-chat-input.tsx:14` |
| todo | Input focus/visibility policy tied to app-ready phases | `prompt-input.tsx:37` |
| todo | Thread session architecture (phase 2 of instant-nav: stable shell vs per-thread controller, explicit resets instead of keyed remounts) | `.llms/ralph/phase2-prd.md` |

## E. Product / MVP gaps

| status | item | source |
|---|---|---|
| todo | Logged-out state broken; non-logged-in app-ready + login UI | `TODO.md` |
| todo | Anonymous accounts; bot protection (Turnstile?) | `mental_board` |
| todo | Login with a different Google account never re-prompts | `TODO.md` |
| todo | Sign-up redirect loses `redirectUrl` | `routes/_auth/sign-up.$.tsx:8` |
| todo | Delete thread in sidebar | `TODO.md` |
| todo | Native-feel drawer on iOS/Android (replace vaul?) | `mental_board` |
| todo | Smooth loading strategy (no cascading loaders), first-login paginated flicker | `mental_board`, `TODO.md` |
| todo | Message footer: align start, retry button; thinking arrow position | `TODO.md` |
| todo | Message UI target spec (header state machine, reasoning block, footer lists) | `proj/chat-message-ui-refactoring/*` |
| todo | Thread sort by `lastSentAt` instead of `updatedAt` (+ future "unread" feed) | `TODO.md` |
| todo | Background precache of thread queries from listing (preload pattern) | `TODO.md`, `use-preload.ts` |
| todo | Stats metadata; `userSubmittedAt` ordering | `TODO.md` |
| parked | Client assistant id complex rollout, thread uuid collision recovery | `backlog.txt` |
| dropped | Edit message | `mental_board` |
| later | Branching, fork, workspaces (placeholder scope exists), attachments | code TODOs, `3-chat-workspace-scope.tsx` |
| ideas | Noise background, Google Sans Flex font | `TODO.md` |

## Backend (Convex / api-service)

| status | item | source |
|---|---|---|
| todo | Non-destructive patches in `convex/chat.ts`; stop manual upsert from client | `TODO.md` |
| todo | Write conflicts on `chat:updateThread` from optimistic upsert | `TODO.md`, `api-service/routers/chat.ts:286,294` |
| todo | Verify RLS covers unchecked ownership paths | `convex/chat.ts:23,52,592,824` |
| todo | `createNewMessageWithParts` throwing on duplicate uuid | `convex/chat.ts:222` |
| todo | `streams.ts` delta readability / null vs empty delta | `convex/streams.ts:124,134` |
| todo | Model access check per user (premium gate is temporary) | `api-service/routers/chat.ts:147` |
| todo | Env-agnostic `waitUntil`; typed RPC errors in transport | `chat.ts:372`, `OrpcChatTransport.ts:61` |

## DX / infra / codebase health

| status | item | source |
|---|---|---|
| todo | Upgrade everything | `1-plan.md` Phase 2, `TODO.md` |
| todo | CI + PR/agent workflow | you |
| todo | `check-types` TS6305 build-order blocker (apps/server) | `short_term.txt` |
| todo | Convex query helper abstraction cleanup (`queries.ts` WIP, cached query "check it works", debug `TODO: remove`) | `lib/convex/queries.ts:35`, `use-convex-query-2-cached.ts` |
| todo | Auth vs Convex separation of concerns | `use-auth.tsx:287`, `use-convex.tsx:9` |
| todo | Misc placement TODOs (`use-preload` not a hook, activity pool test+docs, user-cache key `string[]`) | code |
| parked | Env contract v2 custom builder | `backlog.txt` |
| parked | ai-elements full registry refresh → now part of Phase 2 | `backlog.txt` |
| parked | UI primitives (button/tooltip) unification | `backlog.txt`, `icon-action-button.tsx:5` |
| wip | Remote dev over SSH (mini) | `archive/dev-remote-ssh-wip` |
| todo | Streamdown contrib → drop local tarball | `.tmp/streamdown-2.3.0.tgz` |
| todo | Remove `packages/tmp` experiment | repo |
