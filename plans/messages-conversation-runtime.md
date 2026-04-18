# Plan: Messages Conversation Runtime

> Source PRD: [MESSAGES_PRD.md](/app/MESSAGES_PRD.md)

## Architectural decisions

Durable decisions that apply across all phases:

- **Terminology**: use `conversation` as the primary runtime language. Do not introduce new public `active-thread-v2` naming.
- **Scope lifetime**: the new runtime remains session-scoped inside the existing chat session provider stack. It resets on session change, not on intermediate message changes.
- **Legacy preservation**: the current legacy conversation/message runtime remains untouched and unused during migration. No new logic is added there.
- **Runtime split**: the new runtime is split into three concerns:
  - conversation state
  - conversation actions
  - conversation message store
- **Collocation rule**: provider core and its convenience hooks stay collocated in a small number of deep modules. Avoid one-hook-per-file sprawl unless a submodule becomes independently complex.
- **Rendering model**: conversation list consumes ordered `messageIds`; individual rows consume one message entity each.
- **Reactivity model**: message-order subscription and single-message subscription are separate. Message churn must not update the conversation state context.
- **Store contract**: the message store exposes stable subscription and snapshot APIs, suitable for `useSyncExternalStore`.
- **Message source contract**: the new message source reproduces current visible behavior across persisted, cached, optimistic, resumed-stream, and http-stream layers.
- **Behavior parity target**: scroll behavior, load-older behavior, optimistic shell behavior, regeneration behavior, and visible message ordering must remain unchanged from the user’s perspective.

---

## Phase 1: Conversation Runtime Skeleton

**User stories**: 7, 8, 9, 10, 12

### What to build

Introduce the new conversation-named runtime surface and mount it in the existing chat session scope. This phase establishes the new boundaries first, before changing the list rendering model.

The slice is complete when the live app is mounted through the new runtime facade, but visible product behavior is still equivalent to today. At this stage the key goal is not final perf wins yet; it is to establish the correct architectural seams so later phases do not need to fight the old shape.

Implementation details:

- Add the new session-scoped conversation provider facade.
- Define separate public surfaces for:
  - conversation state
  - conversation actions
  - conversation message access
- Keep provider and convenience hooks collocated in the same core module.
- Ensure the message store context value is a stable API object, not a derived `{ messages, ids }` payload.
- Switch chat session scope wiring to the new provider.
- Keep the old runtime unmodified and no longer used by the live path once this phase lands.

### Acceptance criteria

- [ ] The chat session scope mounts the new conversation runtime instead of the legacy runtime.
- [ ] Public runtime naming uses `conversation` terminology.
- [ ] Legacy runtime files remain unchanged.
- [ ] Conversation state and conversation actions are exposed separately from message collection concerns.
- [ ] No user-visible behavior regression appears at this stage.

---

## Phase 2: Message Store And Id-Based Feed

**User stories**: 1, 2, 3, 4, 5, 13, 14

### What to build

Replace full-message-array consumption in the conversation feed with a message store + id-based feed model. This is the first real reactivity slice and should deliver the primary architectural win: row-level message updates without conversation-level message churn.

Implementation details:

- Implement the stable message store with:
  - ordered id snapshot
  - single-message snapshot
  - order subscription
  - per-message subscription
  - full collection apply/diff logic
- Bind store reads through `useSyncExternalStore`.
- Expose the message-id hook surface for conversation-level consumers.
- Expose the per-message hook surface for row-level consumers.
- Rewire the conversation list to consume ordered ids instead of full messages.
- Add a thin by-id row adapter if needed so the existing message component can continue receiving a full message object.
- Preserve older-history loading control on the message-id surface so list behavior stays coherent.

### Acceptance criteria

- [ ] Conversation list receives ordered `messageIds`, not full message objects.
- [ ] Each message row subscribes only to its own message entity.
- [ ] Message order changes rerender the list subscription path.
- [ ] Single-message content changes rerender only the relevant row path.
- [ ] Snapshot getters are available from the conversation message-id surface.
- [ ] Older-history loading still works from the id-based feed.

---

## Phase 3: Message-Source Parity

**User stories**: 6, 15, 16

### What to build

Replace the legacy message-merge pipeline with the new conversation message source while preserving visible behavior. This phase moves correctness-critical orchestration into the new runtime, but now behind the new store boundary established earlier.

Implementation details:

- Rebuild the message-source module from scratch instead of importing the legacy hook.
- Preserve current layer behavior for:
  - persisted paginated messages
  - cache snapshot
  - optimistic patches
  - resumed convex stream
  - http AI SDK stream
- Preserve current merge priority and filtering semantics.
- Feed the merged collection into the new message store.
- Keep pending/stale/loading status, optimistic patch controls, and older-history controls exposed through the new runtime.

### Acceptance criteria

- [ ] The live conversation feed is driven by the new message-source pipeline.
- [ ] Visible message order matches current behavior under normal load.
- [ ] Optimistic message send behavior matches current behavior.
- [ ] Resumed stream behavior matches current behavior.
- [ ] HTTP stream behavior matches current behavior.
- [ ] Pending, stale, and loading states remain behaviorally correct.

---

## Phase 4: Action Rewire And Legacy Runtime Exit

**User stories**: 9, 10, 11, 15, 16

### What to build

Move all remaining live conversation actions and UI integrations onto the new runtime so the old runtime fully exits the active path. This is the “one cut” completion of the migration, not a gradual bridge.

Implementation details:

- Ensure prompt input actions use the new conversation actions surface only.
- Ensure message footer actions that depend on conversation runtime use the new surface only.
- Ensure regenerate flow uses the new source/store path end-to-end.
- Ensure pending auto-scroll and related conversation-level signals are sourced from the new runtime only.
- Confirm older-history loading, scroll handling, and row rendering are fully wired through the new runtime.
- Remove all live imports of the legacy runtime from app code without editing the legacy files themselves.

### Acceptance criteria

- [ ] Prompt input is wired only to the new conversation actions surface.
- [ ] Regenerate flow runs only through the new conversation runtime.
- [ ] Auto-scroll intent handling runs only through the new conversation runtime.
- [ ] There are no remaining live imports of the legacy runtime in the app path.
- [ ] Legacy files remain present but unused.
- [ ] The conversation feed works end-to-end without any temporary bridge layer.

---

## Phase 5: Verification And Perf Guardrails

**User stories**: 1, 2, 3, 6, 15, 16, 17

### What to build

Lock down the new runtime with explicit verification of correctness and rerender boundaries. This phase is about proving the refactor did what it was supposed to do and documenting the new baseline clearly enough for later work.

Implementation details:

- Add direct verification for message store diff/subscription semantics.
- Add integration coverage for conversation provider surfaces.
- Verify rerender boundaries at the conversation-list level and message-row level.
- Run manual QA for:
  - initial conversation load
  - load older
  - optimistic send
  - streaming
  - resumed stream
  - regenerate
  - auto-scroll behavior
- Update memory/docs so future work starts from the new runtime model, not the legacy one.
- Capture any known remaining risks as explicit follow-up notes rather than hidden assumptions.

### Acceptance criteria

- [ ] Message store semantics are verified with direct tests or equivalent focused checks.
- [ ] Provider hook boundaries are verified with integration-level checks.
- [ ] Conversation-level rerender guardrails are verified.
- [ ] Manual QA confirms no visible regression in scroll/load/send/regenerate/stream behavior.
- [ ] New runtime is documented as the active architecture baseline.
- [ ] Follow-up risks, if any, are written down explicitly.

---

## Suggested execution order

1. Land the new conversation runtime skeleton with stable boundaries first.
2. Move the feed to ids and row-level subscriptions next.
3. Replace the message-source pipeline behind that boundary.
4. Rewire all remaining actions and remove live legacy imports.
5. Finish with verification and documentation.

## Risks to watch

- The highest regression risk is behavioral parity in merge semantics, not store mechanics.
- The highest perf footgun is accidentally leaking derived message arrays back into context values.
- The highest migration footgun is partial rewiring, where some consumers still read from legacy runtime and others from the new runtime.
- The highest UX regression risk is scroll/auto-scroll timing around optimistic send and resumed streaming.

## Unresolved questions

- none
