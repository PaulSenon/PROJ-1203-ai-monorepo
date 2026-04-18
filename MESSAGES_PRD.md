# Messages PRD

This doc is the working index for the conversation/messages runtime refactor.

## References

- `apps/web/src/components/README.md`
  What: canonical L1/L2/L3 component architecture rules.
  Use when: deciding whether logic belongs in app layer vs design-system layer.
- `apps/web/src/components/providers/README.md`
  What: provider lifetime/scope rules for app, user, chat app, workspace, session.
  Use when: deciding where conversation runtime providers should mount/reset.
- `.llms/proj/chat-message-ui-refactoring/3-desired-component-code-architecture.md`
  What: earlier message component architecture intent.
  Use when: aligning this PRD with the existing compound-component direction.
- `.llms/proj/chat-message-ui-refactoring/5-prd-message-ui.md`
  What: older PRD for message UI, reasoning, footer, status, ordered parts rendering.
  Use when: working on message rendering/UI behavior, not store/provider boundaries.
- `.agents/skills/grill-me/SKILL.md`
  What: design stress-test workflow.
  Use when: a future design branch is still ambiguous and needs forced decision-tree clarification before coding.

## Problem Statement

Current active-thread runtime couples two different concerns too tightly:

- conversation/session state and actions
- live message collection and streaming updates

Today the same runtime/provider family computes thread state, exposes the full `messages` array, and drives conversation rendering from that same surface. This makes message-level churn propagate too high in the tree. Streaming tokens and message patching can therefore perturb conversation consumers that should only care about stable conversation state.

The current ubiquitous language is also off. `active-thread` is not the right long-term term for this app surface. We want `conversation` as the primary language.

Another hard requirement: the current `use-thread-active` / `use-messages` implementation must remain untouched and available as reference during migration. We want a clean replacement, not mutation-in-place.

## Solution

Create a new conversation runtime built around a strict split:

- conversation state/actions
- conversation message collection/store

The new runtime will use `conversation` naming, not `active-thread-v2` naming. The provider facade may stay singular, but internally it must isolate message reactivity from conversation state reactivity.

The message collection will move to an id-based rendering model:

- conversation UI consumes ordered `messageIds`
- each rendered row subscribes to a single message entity
- conversation state consumers no longer subscribe to the full `messages` array

The old runtime stays unused and unmodified until manual deletion later.

## User Stories

1. As a developer, I want conversation state updates and message streaming updates separated, so that I can reason about reactivity boundaries clearly.
2. As a developer, I want token streaming in one message to rerender only the relevant message row, so that the conversation surface stays stable.
3. As a developer, I want the conversation layout to depend on ordered message ids instead of full message objects, so that list-level rerenders are minimized.
4. As a developer, I want a per-message snapshot getter, so that message rows can read current entity data without subscribing the whole conversation tree.
5. As a developer, I want message-order subscription separate from message-entity subscription, so that order changes and content changes are handled independently.
6. As a developer, I want message source merging to preserve current behavior for persisted, cached, optimistic, resumed-stream, and http-stream layers, so that this refactor does not regress chat correctness.
7. As a developer, I want the new runtime to use `conversation` naming, so that the ubiquitous language becomes more coherent.
8. As a developer, I want provider core and convenience hooks collocated, so that tightly bound runtime code is edited in one place instead of scattered over tiny satellite files.
9. As a developer, I want the legacy runtime files left untouched, so that I can compare old and new behavior during migration.
10. As a developer, I want the session-scope provider registration to switch to the new runtime without editing the old runtime files, so that migration stays explicit and reversible.
11. As a developer, I want the conversation UI rewired directly to ids in one cut, so that there is no temporary adapter layer to maintain.
12. As a developer, I want stable provider/store api objects, so that React context updates do not happen just because derived arrays changed.
13. As a developer, I want snapshot getters exposed from the message-id hook surface, so that consumers needing sync reads have a supported path.
14. As a developer, I want ordering concerns and message content concerns modeled as separate subscriptions, so that future virtualization/perf work has a cleaner base.
15. As a user, I want conversation scrolling, auto-scroll, and older-history loading to keep working exactly as before, so that performance refactor does not change UX.
16. As a user, I want streaming messages, optimistic shells, and regeneration flows to keep behaving correctly, so that the refactor is invisible at product level.
17. As a maintainer, I want this PRD to act as the index for the messages/conversation refactor, so that future work can quickly branch into the right deeper doc.

## Implementation Decisions

### Ubiquitous language

- Rename the runtime concept from `active thread` to `active conversation`.
- New files and exported APIs must use `conversation` language.
- Do not create paths like `active-thread-v2`.

### Legacy preservation

- Do not modify current legacy runtime files.
- Do not add new logic to the current `use-thread-active` / `use-messages` implementation.
- Stop importing them once the new runtime is wired.
- Keep them unused as reference until manual cleanup later.

### New runtime shape

Create a new conversation runtime under a conversation-focused path. Keep intrinsically-bound provider/hook code collocated in a small number of core files, not fragmented by default.

Recommended file grouping:

- one core file for the conversation provider + convenience hooks for state/actions/message ids
- one file for the message store implementation if it becomes substantial
- one file for the message-source/merge logic if it becomes substantial

Avoid splitting trivial context hooks into many one-hook-per-file satellites.

### Provider boundary

The exported facade may remain a single `ActiveConversationProvider`-style provider if that keeps usage simple.

Internally it must compose three concerns:

- conversation state context
- conversation actions context
- conversation message store context

The message store context value must be a stable store API object, not a derived object carrying `messages` or `messageIds` directly.

### Conversation state contract

Conversation state surface must contain only conversation/session-level values:

- conversation/session id
- stream status
- pending/stale flags
- streaming boolean
- settled boolean
- pending auto-scroll message id
- queued messages if still needed for future behavior

It must not expose:

- full `messages`
- `messageIds`
- snapshot arrays derived from messages

Message-level churn must therefore not update the conversation state context.

### Conversation actions contract

Conversation actions surface must expose the send/cancel/regenerate behavior needed by prompt input and message actions.

Actions stay conversation-scoped and independent from message collection subscription mechanics.

### Message store contract

The message store is the core runtime boundary for message reactivity.

It must support:

- subscription to message order changes
- subscription to a single message entity change
- snapshot getter for ordered ids
- snapshot getter for a single message entity
- optional per-entity version getter if useful for diagnostics/selectors
- applying a full merged collection into the store

Recommended model:

- `ids: string[]`
- `entities: Map<string, Message>`
- per-entity version map
- order version
- listeners for order and for each message id

Recommended React binding:

- use `useSyncExternalStore`
- one hook subscribes to order
- one hook subscribes to a single message id

### Message source and merge logic

Do not import the legacy `use-messages` hook into the new runtime.

Rebuild equivalent merge behavior in a new message-source module, preserving current semantics:

- persisted paginated messages
- cache layer
- optimistic patches
- resumed convex stream layer
- http AI SDK stream layer

Preserve current merge priorities and filtering rules so UX behavior does not change during the runtime refactor.

The message source module should return:

- merged messages
- pending/stale/loading flags
- older-history status
- older-history load action
- optimistic patch apply/revert actions

### Data flow

Target flow:

1. message source computes merged `messages`
2. provider diffs/applies them into stable message store
3. conversation layout subscribes only to `messageIds`
4. each message row subscribes only to its own message entity

This means message streaming updates no longer force conversation state consumers to rerender.

### Conversation UI rewiring

Rewire straight to ids. No temporary adapter layer.

Conversation-level rendering must:

- read conversation state from conversation state hook
- read ordered ids from conversation message-ids hook
- keep older-history loading logic on the ids hook surface

Virtualized list must switch from message objects to ids:

- list data becomes `messageIds`
- item key is the id
- item type may be resolved through store snapshot getter
- row renderer resolves message data through a per-id hook

Add a thin `ChatMessageById`-style app component if needed so the existing `ChatMessage` component can remain object-based.

### Session-scope integration

Update chat session provider registration to mount the new conversation runtime provider.

Do not mount both old and new runtimes in parallel unless there is a proven need.

### Module depth goal

Prefer deep modules over shallow module sprawl:

- conversation provider file owns provider wiring + convenience hooks
- message store module owns diff/subscription mechanics behind a small api
- message source module owns merge semantics behind a small api

This should make future perf work, virtualization work, and correctness debugging easier.

## Testing Decisions

Good tests verify externally visible behavior and reactivity guarantees, not implementation trivia.

Primary behaviors to validate:

- conversation state consumers do not rerender from single-message content churn
- single message row rerenders when its message changes
- order subscribers rerender when ids/order change
- older-history pagination still works
- optimistic send/regenerate flows still produce correct visible message order/content
- resumed stream and http stream still converge to correct merged visible messages

Modules worth direct testing:

- message store diff/apply behavior
- order/entity subscription behavior
- message source merge behavior
- conversation provider integration at hook boundary

Preferred test style:

- store-level tests for diff/subscription semantics
- hook/integration tests for provider surfaces
- UI behavior tests focused on visible rendering and rerender boundaries where practical

Manual verification remains important for:

- conversation auto-scroll
- initial anchor behavior
- load older
- streaming smoothness
- regenerate flow

## Out of Scope

- deleting legacy runtime files
- progressive bridge/adapters between old message-object list and new id-based list
- broad message UI redesign
- changing message content rendering contracts
- changing provider lifetime model outside session-scoped conversation runtime
- sidebar virtualization or unrelated broader chat perf work

## Further Notes

- This PRD is about runtime and reactivity architecture, not message visual design.
- Existing message UI/refactor docs remain relevant for message rendering concerns; this doc is the index and architecture anchor for the conversation/message runtime split.
- If later work reveals naming issues elsewhere, prefer continuing the same ubiquitous language migration toward `conversation` rather than reviving `active-thread` terminology.
