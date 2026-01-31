# PRD: Message UI Refactor (Core)

## Problem Statement

Chat message UI is split across messy iterations with inconsistent layering, layout shifts during streaming, incomplete status UX, and a broken demo page. Developers also lack a stable, layer-correct map to evolve message UI without refactors.

## Solution

Ship the core message refactor aligned to the 3-layer model, with minimal but working L2 primitives for reasoning and status. Footer actions/stats stay L3-only placeholders so future PRDs can replace internals without touching message layout or composition.

## User Stories

1. As a user, I want my messages right-aligned (end-aligned for RTL support), so conversation scanning is clear.
2. As a user, I want assistant messages left-aligned (start-aligned for RTL support), so the dialog feels natural.
3. As a user, I want a stable header while streaming, so there is no layout jump.
4. As a user, I want to see "Thinking..." before output, so I know work is happening.
5. As a user, I want "Reasoning..." with a toggle while reasoning streams, so I can inspect it.
6. As a user, I want reasoning preview to disappear after response starts, so text feels continuous.
7. As a user, I want my reasoning toggle choice to persist, so my choice is respected.
8. As a user, I want streamed text to feel smooth, so reading is stable.
9. As a user, I want long code/tables to stay within the message, so layout does not break (overflow-x-auto).
10. As a user, I want a cancelled callout, so I know the outcome.
11. As a user, I want an error callout, so I can recover.
12. As a user, I want footer actions visible on message hover (desktop), so UI stays minimal.
13. As a user, I want footer always visible on mobile, so actions remain reachable.
14. As a user, I want message stats when available, so I can assess performance.
15. As a developer, I want strict L2/L3 boundaries, so refactors stay safe.
16. As a developer, I want a pure layout layer, so UI can be tested without hooks.
17. As a developer, I want placeholder action/stat lists now, so message UI can ship without complex menus.
18. As a developer, I want legacy message code removed after migration, so maintenance improves.
19. As a designer, I want minimal, high-end styling, so the UI feels premium.
20. As an accessibility user, I want ARIA-safe toggles/buttons, so UI is usable.

## Implementation Decisions

### Scope Split

In scope:

- Core message refactor + demo page
- Minimal, working Reasoning + Status L2 with stable APIs
- Footer placeholder implemented in L3 only (no fixed Action/Stat API yet)

Deferred to separate PRDs:

- Reasoning block full behavior and styling
- Status block full variants and visuals
- Action/Stat list full procedural behavior (context menus, sub-actions, model picker) + formal L2 API

### Architecture and File Map

L1 (immutable):

- `apps/web/src/components/ai-elements/*`
- `apps/web/src/components/ui/*`

L2 (app-agnostic):

- `apps/web/src/components/ui-custom/chat/message.tsx` -> `Message.*`
- `apps/web/src/components/ui-custom/chat/reasoning.tsx` -> `Reasoning.*` (placeholder now)
- `apps/web/src/components/ui-custom/feedback/status-block.tsx` -> `StatusBlock.*` (placeholder now)

L3 (feature, complex):

- `apps/web/src/components/chat/message/message.tsx` -> entry adapter
- `apps/web/src/components/chat/message/message-layout.tsx` -> pure layout
- `apps/web/src/components/chat/message/message-user.tsx` -> user variant
- `apps/web/src/components/chat/message/message-assistant.tsx` -> assistant variant
- `apps/web/src/components/chat/message/_parts/content.tsx`
- `apps/web/src/components/chat/message/_parts/reasoning.tsx`
- `apps/web/src/components/chat/message/_parts/status.tsx`
- `apps/web/src/components/chat/message/_parts/footer.tsx` (placeholder footer; no fixed action/stat API)
- `apps/web/src/components/chat/message/_hooks/use-message-context.ts`

Demo page:

- `apps/web/src/routes/components/_components/messages.tsx`

### L2 Type Rules

- L2 may import L1 contract types (ex: `UIMessage`, `FileUIPart` from `ai`).
- L2 must never import app types (ex: `MyUIMessage`, `Thread`).
- L2 defines its own interfaces for data it needs.

### L3 Adapter Hook

`use-message-context` maps `MyUIMessage` and stream flags to plain data slices for layout and parts:

- owner (user/assistant)
- text content (response markdown)
- reasoning text
- status (none/cancelled/error) + error kind + params
- metadata for stats (timestamps, model id, token counts, timing)
- derived reasoning state flags (see below)

### Reasoning State Machine (A/B/C/D)

Inputs: `isThreadStreaming`, `isLastMessage`, `message.parts`.
Derived:

- `hasReasoningText`, `hasResponseText`, `lastPartType`
- `isReasoningStreaming = isThreadStreaming && isLastMessage && lastPartType == "reasoning"`
- `hasResponseStartedRef` (latched once response begins)
- `reasoningEnded = hasReasoningText && hasResponseStartedRef`

States:

- A: no reasoning nor response text -> header "Thinking..." with shimmer
- B: reasoning streaming -> header "Reasoning..." + toggle + preview
- C: reasoning ended -> "Thought for Xs" + toggle; preview hidden
- D: response only -> no header

Transitions:

response with reasoning:

- A → B: First reasoning content tokens stream in
- B → C: Reasoning streaming ends (derive from parts + thread streaming state)

response without reasoning:

- A → D: Response text starts streaming directly without reasoning

Layout stability:

- header row fixed min height across A/B/C
- toggle icon width reserved even when hidden

> Note: out of scope, but from message parent component (conversation), streaming message will be set a min-height via message component classNmae prop, to make the message container almost full vh, to avoid any layout shifts. So the layout shift concerns in only from the message component perspective and bellow. The message component should be handling this min-height className properly (it should not mush the footer, but just reserve space for the full message component. The footer should still be shown right after message content, and be pushed down with message content growing.)

### Reasoning Block (placeholder, stable API)

L2 `Reasoning.*` provides:

- Root with `isStreaming`, `open`, `onOpenChange`
- Trigger slot
- Preview slot
- Content slot

L3 `_parts/reasoning.tsx` wires:

- toggle state
- preview vs content rendering rules
- streaming flags

### Status Block (placeholder, stable API)

L2 `StatusBlock.*` provides:

- Root with `kind` (info/warning/error/debug)
- Icon, Content, Title, Body, Actions slots

L3 `_parts/status.tsx` adapts:

- Cancelled: fixed copy, warning style
- Error: maps error kind to title/body/actions
- Placement: after content, before footer
- Precedence: cancelled > error > none

### Actions/Stats Lists (L3-only placeholder)

L3 `_parts/footer.tsx` placeholder behavior:

- Actions: Copy, Retry (simple click only)
- Stats: model id, output tokens, tps (if available)
- Desktop: footer visible on hover, fixed footprint
- Mobile: footer always visible

No L2 Action/Stat list API in this PRD. The footer placeholder must be isolated to a single L3 file so the follow-up Action/Stat PRD can replace internals without touching message composition.

### Message Content

- Use SmoothMarkdown for response streaming
- Guard overflow for code blocks/tables

### Performance

- Split stable vs streaming data to minimize rerenders
- Keep streaming text in isolated component
- Prefer stable children + context for streaming data (avoid passing stream props through heavy UI)

### Demo Page

Must be updated alongside each task:

- Controls: isThreadStreaming, isLastMessage, hasReasoning, hasResponse, header override, collapsed toggle, long content, error/cancelled, mobile width
- Fake streaming: chunked words + pause between reasoning and response
- Demo must remain usable on mobile widths

### Cleanup

- Remove legacy message components only after all imports migrate

## Testing Decisions

- Ask a review sub-agent to review your changes against the prd and task picked.
- Ask a review sub-agent performance reviewer to review your changes based on react skills and best practices to make sure we are following the best practices in terms of performance and reactivity in react19.
- Ask a review sub-agent accessibility reviewer to review your changes based on accessibility best practices to make sure we are following the best practices in terms of accessibility.
- Manual QA in demo page for A/B/C/D, collapsed/expanded, hover vs mobile, long content, error/cancelled
- Automated tests deferred until a test framework exists in apps/web

## Out of Scope

- Full procedural actions/stats system
- Full status block visuals and variants
- Full reasoning block visuals and streaming polish
- Backend streaming status changes
- New error kinds or i18n system

## Further Notes

References:

- `apps/web/src/components/README.md` for our component guidelines
- `.llms/proj/chat-message-ui-refactoring/1-ui-requirements.md` rough user written base requirement used to write this prd
- `.llms/proj/chat-message-ui-refactoring/2-current-state-of-message-ui.md` rough user written current state of the message ui for reference
- `.llms/proj/chat-message-ui-refactoring/6-tmp-message-l2-performance-recommendation.md` llm assisted side notes on basic Message L2 performance patterns and recommendations
- `.llms/proj/chat-message-ui-refactoring/6-tmp-better-component-naming-rules.md` llm assisted side notes on better component naming rules (based on component guidelines)

Follow-up PRDs (to be authored separately):

- Reasoning block L2
- Status block L2
- Action/Stat list L2

## Task List

- T1: Scaffold L2 Message + L3 layout + minimal demo shell (static user/assistant)
- T2: Add adapter hook + reasoning state machine + placeholder Reasoning block + demo controls
- T3: Integrate SmoothMarkdown streaming + overflow guards + demo streaming
- T4: Add status placeholder mapping + demo toggles (error/cancelled)
- T5: Add footer L3-only placeholder + hover/mobile visibility + demo controls
- T6: Cleanup legacy message components

## Definition of Done

- L2/L3 match `apps/web/src/components/README.md`
- Demo page renders all states without layout shift
- Placeholder L2 Reasoning/Status APIs stable for follow-up PRDs
- Legacy message code removed or unused
