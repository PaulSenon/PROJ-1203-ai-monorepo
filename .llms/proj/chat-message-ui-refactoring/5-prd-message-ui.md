# PRD: Message UI Refactor (Core)

## Problem Statement

Chat message UI is split across messy iterations with inconsistent layering. Current implementation flattens parts and loses ordered streaming behavior. Reasoning UX assumes a single top block, but in reality reasoning can appear mid‑message and multiple times. Demo page is broken and not usable for QA.

## Solution

Rebuild message UI around ordered `UIMessage.parts` rendering. Each part renders in sequence; reasoning parts map to reasoning blocks (0..N). A message‑level “Thinking…” placeholder shows only when no content parts exist. Reasoning blocks manage their own streaming/done state via `part.state`. L2/L3 boundaries are strict. Demo page becomes a focused QA surface with controls for part order, multiple reasoning blocks, and streaming.

## User Stories

1. As a user, I want my messages end‑aligned (RTL safe), so conversation scanning is clear.
2. As a user, I want assistant messages start‑aligned (RTL safe), so dialog feels natural.
3. As a user, I want parts to appear in the exact stream order, so content feels coherent.
4. As a user, I want a “Thinking…” placeholder before any content, so I know work is happening.
5. As a user, I want a reasoning block while reasoning streams, so I can inspect it.
6. As a user, I want reasoning to collapse after it finishes, so response feels continuous.
7. As a user, I want multiple reasoning blocks if reasoning reappears, so I can track each phase.
8. As a user, I want my reasoning toggle choice to persist per block, so my choice is respected.
9. As a user, I want streamed text to feel smooth, so reading is stable.
10. As a user, I want long code/tables to stay within the message, so layout does not break.
11. As a user, I want a cancelled callout, so I know the outcome.
12. As a user, I want an error callout, so I can recover.
13. As a user, I want footer actions visible on hover (desktop), so UI stays minimal.
14. As a user, I want footer always visible on mobile, so actions stay reachable.
15. As a user, I want message stats when available, so I can assess performance.
16. As a developer, I want strict L2/L3 boundaries, so refactors stay safe.
17. As a developer, I want a pure layout layer, so UI can be tested without hooks.
18. As a developer, I want placeholder action/stat lists now, so UI can ship without full menus.
19. As a developer, I want legacy message code removed after migration, so maintenance improves.
20. As a designer, I want minimal, high‑end styling, so UI feels premium.
21. As an accessibility user, I want ARIA‑safe toggles/buttons, so UI is usable.
22. As a user, I want empty reasoning blocks to show a header without a toggle, so I do not expand empty content.

## Implementation Decisions

### Scope Split

In scope:

- Core message refactor + demo page
- Ordered parts rendering (text + reasoning)
- Minimal, working Reasoning + Status L2 with stable APIs
- L2 Message.Footer container + L3 footer content placeholders (user + assistant)

Deferred to separate PRDs:

- Reasoning block full visuals and polish
- Status block full variants and visuals
- Action/Stat list L2 API
- Part‑level timing metadata (see pre‑PRD)

### Architecture and File Map

L1 (immutable):

- `apps/web/src/components/ai-elements/*`
- `apps/web/src/components/ui/*`

L2 (app‑agnostic):

- `apps/web/src/components/ui-custom/chat/message.tsx` -> `Message.*`
- `apps/web/src/components/ui-custom/chat/reasoning.tsx` -> `Reasoning.*`
- `apps/web/src/components/ui-custom/feedback/status-block.tsx` -> `StatusBlock.*`

L3 (feature):

- `apps/web/src/components/chat/message/message.tsx` -> entry
- `apps/web/src/components/chat/message/message-layout.tsx` -> pure layout (if split)
- `apps/web/src/components/chat/message/message-user.tsx` -> user variant
- `apps/web/src/components/chat/message/message-assistant.tsx` -> assistant variant
- `apps/web/src/components/chat/message/_parts/content.tsx` -> parts iterator
- `apps/web/src/components/chat/message/_parts/text-part.tsx` -> text part renderer
- `apps/web/src/components/chat/message/_parts/reasoning-part.tsx` -> reasoning block renderer
- `apps/web/src/components/chat/message/_parts/status.tsx`
- `apps/web/src/components/chat/message/_parts/footer.tsx`
- `apps/web/src/components/chat/message/_hooks/use-message-context.ts`

Demo page:

- `apps/web/src/routes/components/_components/messages.tsx`

### L2 Type Rules

- L2 may import L1 contract types (ex: `UIMessage`, `FileUIPart` from `ai`).
- L2 must never import app types (ex: `MyUIMessage`).
- L2 defines its own interfaces for data it needs.

### Parts Rendering (Canonical)

Parts are the source of truth and must be rendered in order. No flattening.

Pseudo:

- for each part in `message.parts`:
  - `reasoning` -> `<ReasoningPart />`
  - `text` -> `<TextPart />`
  - other types -> stub/ignore until implemented

This enables tool/file parts later without re‑architecture.

### Message‑Level State

- `hasContentParts = any reasoning/text with non‑empty text`
- If `!hasContentParts` and no error/cancel status, show `Message.Thinking` placeholder (L2) in assistant layout.

### Reasoning Block State (per part)

Each reasoning part renders a block. No grouping.

- `part.state === "streaming"` -> header “Reasoning…” + toggle + preview
- `part.state === "done"` -> header “Thought for Xs” if duration known otherwise "Thought for a few seconds".
- When done, content collapsed by default; preview hidden.

Empty reasoning:

- If `part.text` is empty or whitespace, render header only; hide toggle, preview, and content.
- Empty reasoning still counts as a reasoning block (no thinking placeholder).

Layout stability:

- Header row fixed min‑height across streaming/done
- Toggle icon width reserved even when hidden

### Reasoning Block (placeholder, stable API)

L2 `Reasoning.*` provides:

- Root with `isStreaming`, `open`, `onOpenChange`
- Trigger slot
- Preview slot
- Content slot

L3 `_parts/reasoning-part.tsx` wires:

- Toggle state per block
- Preview vs content rules
- `part.state` mapping to streaming/done

### Status Block (placeholder, stable API)

L2 `StatusBlock.*` provides:

- Root with `kind` (info/warning/error/debug)
- Icon, Content, Title, Body, Actions slots

L3 `_parts/status.tsx` adapts:

- Cancelled: fixed copy, warning style
- Error: maps error kind to title/body/actions
- Placement: after content, before footer
- Precedence: cancelled > error > none

### Footer Container (L2)

L2 `Message.Footer` provides:

- Container slot for footer content
- Visibility logic: hover‑reveal on desktop, always visible on mobile
- Constant footprint when hidden (no layout shift)
- Placement: inside `Message.Root`, after `Message.Content`, for both roles

### Footer Content (L3 placeholders)

L3 footer content components (separate per role):

- `footer-assistant`: placeholder actions + stats
  - Actions: Copy, Retry (simple click only)
  - Stats: model id, output tokens, tps (if available)
- `footer-user`: placeholder actions only
  - Actions: Copy (simple click only)
  - Stats: none

No L2 Action/Stat list API in this PRD.

### Message Content

- Use SmoothMarkdown for text parts
- Guard overflow for code blocks/tables (`overflow-x-auto`)

### Performance

- Split stable vs streaming data to minimize re‑renders
- Keep per‑part rendering isolated (text part component memoized)
- Avoid passing stream props through heavy layout
- Pass metadata and parts separately; avoid passing full message to non‑stream UI (parts stream and are rerender‑heavy)

### Demo Page

Must be updated alongside each task:

- Controls: isThreadStreaming, isLastMessage
- Parts builder: add/remove parts, reorder parts
- Reasoning block controls: per‑block state (streaming/done), toggle state
- Scenarios: thinking only, reasoning→text, text→reasoning→text
- Long content switch for overflow
- Error/cancelled toggles
- Mobile width toggle

### Cleanup

- Remove legacy message components only after all imports migrate

## Testing Decisions

- Ask a review sub-agent to review PRD alignment after each task
- Ask a review sub-agent to review performance patterns (React 19) (using relevant skills)
- Ask a review sub-agent to review accessibility (using relevant skills)
- Manual QA in demo page:
  - parts order preserved
  - multiple reasoning blocks
  - thinking placeholder appears only when no content
  - reasoning streaming vs done
  - hover vs mobile footer
  - long content overflow

## Out of Scope

- Full procedural actions/stats system
- Full status block visuals and variants
- Full reasoning block visuals and streaming polish
- Backend timing metadata per reasoning part
- New error kinds or i18n

## Further Notes

References:

- `apps/web/src/components/README.md` for component guidelines
- `.llms/proj/chat-message-ui-refactoring/1-ui-requirements.md`
- `.llms/proj/chat-message-ui-refactoring/2-current-state-of-message-ui.md`

Follow‑up PRDs:

- Reasoning block L2
- Status block L2
- Action/Stat list L2
- Reasoning timing metadata (pre‑PRD)

## Task List

- T1: Scaffold L2 Message + L3 parts iterator + minimal demo (text only)
- T2: Add reasoning part block + reasoning state + demo controls
- T3: Integrate SmoothMarkdown streaming + overflow guards + demo streaming
- T4: Add status placeholder mapping + demo toggles (error/cancelled)
- T5: Add L2 Message.Footer container + L3 user/assistant footer placeholders + hover/mobile visibility + demo controls
- T6: Cleanup legacy message components
- T7: Disable reasoning toggle for empty reasoning text (keep header, no preview/content)

## Definition of Done

- Parts render in order; no flattening
- Reasoning blocks support multiple instances
- Demo renders all states without layout shift
- L2/L3 match `apps/web/src/components/README.md`
- Legacy message code removed or unused

## Notes

- We don't care about previous existing code for message ui. We are starting from scratch.
