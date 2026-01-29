# PRD v2: Message UI Refactoring

## Problem Statement

Current chat message UI split across two incomplete iterations with messy layering, inconsistent behavior, missing requirements (reasoning header states, footer overflow, status blocks), and a broken demo page. Need a stable, composable, high-perf message system aligned to the 3-layer architecture and ai-elements primitives.

## Solution

Refactor into:
- **L2**: Single-file compound Message API (shadcn-like) in `ui-custom/chat/message.tsx`
- **L3**: Adapter that maps app state + MyUIMessage to L2 in `chat/chat-message.tsx`
- Clean demo page with all states and interactive controls

Implement reasoning header state machine A/B/C/D with zero layout shift, collapsible reasoning preview, streamed content via ai-elements MessageResponse, composable status blocks, and responsive action/stats footer with More menus. Remove legacy implementations after migration.

## User Stories

1. As a user, I want my own messages right-aligned and simple, so reading feels clean.
2. As a user, I want assistant messages left-aligned, so conversation flows naturally.
3. As a user, I want a stable header while assistant thinks, so no layout jump.
4. As a user, I want to see "Thinking..." before any output, so I know it is working.
5. As a user, I want to see "Reasoning..." with a toggle while reasoning streams, so I can inspect it.
6. As a user, I want reasoning preview to vanish once response starts, so text feels continuous.
7. As a user, I want the reasoning toggle state to persist when reasoning ends, so my choice is respected.
8. As a user, I want response text to stream smoothly, so output feels continuous.
9. As a user, I want long code or tables not to break layout, so UI stays readable.
10. As a user, I want a status callout for errors, so I know what to do.
11. As a user, I want a status callout when cancelled, so I can continue or retry.
12. As a user, I want to copy message text quickly, so I can reuse it.
13. As a user, I want retry/fork/export actions (UI only, mocked for now).
14. As a user, I want action tooltips, so buttons are clear.
15. As a user, I want right-click or long-press actions, so advanced actions are discoverable.
16. As a user, I want a "More actions" menu on small screens, so UI stays uncluttered.
17. As a user, I want a "More stats" menu on small screens, so stats stay available.
18. As a user, I want footer visibility on hover desktop, so UI stays minimal.
19. As a user, I want footer always visible on mobile, so actions are accessible.
20. As a user, I want message stats (TTFT, tokens, model) when available.
21. As a user, I want copy button to show checkmark briefly after copying, so I get feedback.
22. As a user, I want extremely long reasoning (10k+ tokens) to not break performance.
23. As a user, I want to rapidly toggle reasoning without UI glitches.
24. As a developer, I want a single L2 compound API, so L3 usage is readable.
25. As a developer, I want no barrel exports, so lint rules are satisfied.
26. As a developer, I want no direct edits in L1 registries, so upgrades are easy.
27. As a developer, I want memoized subparts, so streaming does not re-render heavy UI.
28. As a developer, I want a dedicated demo page for message states, so UI iteration is fast.
29. As a developer, I want old message code removed safely, so maintenance improves.
30. As a designer, I want subtle, minimal styling, so it feels high-end.
31. As an accessibility user, I want ARIA compliant actions and menus.

## Implementation Decisions

### Layer Architecture

- **L1 (Immutable)**: Use ai-elements Message, MessageResponse, Shimmer, Reasoning primitives. Do NOT modify.
- **L2 (App-Agnostic)**: Wrap L1 primitives with app styling. No app hooks, no app types. No custom context (use L1 context where it exists).
- **L3 (App Layer)**: `chat/chat-message.tsx` maps MyUIMessage + hooks → L2 component props.

### CRITICAL: L2 Must Wrap L1, Not Reimplement

> **WARNING**: L2 components MUST wrap/compose L1 primitives from ai-elements. Do NOT reimplement functionality that already exists in L1.
>
> Before creating any L2 component, check:
> 1. Does ai-elements already have this? → Wrap it with styling
> 2. Does an existing L2 fragment already have this? → Reuse it
> 3. Neither exists? → Only then create new component

### Existing L2 Fragments (DO NOT RECREATE)

These already exist and implement most PRD requirements:

| Fragment | Location | What it does |
|----------|----------|--------------|
| `ThinkingBlock` | `thinking-block.tsx` | A/B/C/D state machine, preview, toggle |
| `ChatStatusMessage.*` | `message-status.tsx` | Error/cancelled compound |
| `ChatMessageErrorBlock` | `message-status.tsx` | Error status with actions |
| `ChatMessageCancelledBlock` | `message-status.tsx` | Cancelled status with actions |
| `ChatMessageFooter` | `message-footer.tsx` | Hover-reveal footer container |
| `ChatMessageActions` | `message-actions.tsx` | Action button container |
| `ChatMessageAction` | `message-action.tsx` | Button with tooltip + context menu |
| `ChatMessageInfos` | `message-infos.tsx` | Stats container |
| `ChatMessageInfo` | `message-info.tsx` | Single stat display |
| `ChatMessageContent` | `message-content.tsx` | Role-based content styling |

### L2 Namespace Purpose

The `message.tsx` file creates a unified namespace that:
1. **Wraps L1** with thin styling wrappers (memoized)
2. **Does NOT re-export** existing L2 fragments (barrel exports forbidden by linter)
3. **Does NOT create new context** (use ai-elements context like `useReasoning()`)

```typescript
// message.tsx wraps L1 ai-elements only
export const Message = {
  Root,             // wraps ai-elements Message
  Content,          // wraps ai-elements MessageContent
  Response,         // wraps ai-elements MessageResponse
  Actions,          // wraps ai-elements MessageActions
  Action,           // wraps ai-elements MessageAction
  Toolbar,          // wraps ai-elements MessageToolbar
  Reasoning,        // wraps ai-elements Reasoning
  ReasoningTrigger, // wraps ai-elements ReasoningTrigger
  ReasoningContent, // wraps ai-elements ReasoningContent
};

// Other L2 fragments imported separately:
// import { ThinkingBlock } from "./thinking-block";
// import { ChatMessageFooter } from "./message-footer";
// import { ChatStatusMessage } from "./message-status";
// etc.
```

### L3 Adapter Role

L3 (`chat-message.tsx`) does the work:
1. Extracts data from `MyUIMessage` (app type)
2. Computes derived state (isReasoningStreaming, etc.)
3. Passes props to L2 components (no context injection needed)
4. Composes L2 primitives into the final message UI

### L3 Signal Derivation

Inputs available:
- `message: MyUIMessage` — the message object with parts and metadata
- `isThreadStreaming: boolean` — from `useChatActive()` hook (build as if it exists)
- `isLastMessage: boolean` — computed in parent list

Derived signals:
```typescript
const hasReasoningText = message.parts.some(p => p.type === 'reasoning' && p.text);
const hasText = message.parts.some(p => p.type === 'text' && p.text);
const lastPartType = message.parts.at(-1)?.type;

// Reasoning is actively streaming if:
// - Thread is streaming AND
// - This is the last message AND
// - Last part is reasoning type
const isReasoningStreaming = isThreadStreaming && isLastMessage && lastPartType === 'reasoning';

// Latch "text started" in a ref to prevent flip-flop when more reasoning arrives
const hasTextStartedRef = useRef(false);
if (hasText) hasTextStartedRef.current = true;

const reasoningEnded = hasReasoningText && hasTextStartedRef.current;
```

### State Machine (A/B/C/D)

| State | Condition | Header Renders |
|-------|-----------|----------------|
| A "Thinking..." | `!hasReasoningText && !hasText` | Shimmer text, no toggle |
| B "Reasoning..." | `hasReasoningText && isReasoningStreaming` | Shimmer text + toggle + collapsed preview |
| C "Thought for Xs" | `reasoningEnded` | Static text + toggle (preview gone, expanded unchanged) |
| D (no header) | `hasText && !hasReasoningText` | Nothing (text streams directly) |

Transitions:
- A → B: First reasoning tokens arrive
- B → C: First text tokens arrive (hasTextStartedRef latches)
- A → D: First text tokens arrive without reasoning

### Layout Stability Rules

- Header row has `min-h-6` to reserve space
- Toggle icon has fixed width (even when hidden via `invisible`) to prevent CLS
- "Thinking..." and "Reasoning..." use `<Shimmer>` from ai-elements (1s animation)
- Collapsed preview uses fixed `previewLines * lineHeight` with vertical fade mask
- State C: collapsed preview replaced with nothing, NOT removed from DOM (use `visibility: hidden` or conditional render with stable height)

### Reasoning Preview

- Default `previewLines = 2`, line height = `1.25rem`
- Shows last N wrapped lines (scroll to bottom of content, crop top)
- Vertical fade mask (gradient from transparent to background)
- Expanded: full content in subtle box (`border + muted bg`)
- Toggle state persists: if user expanded during B, stays expanded in C

### Content Rendering

- Use ai-elements `<MessageResponse>` for markdown (already memoizes blocks via Streamdown)
- Wrapper has `max-w-full overflow-x-auto` for tables/code
- Long tokens use `break-words` / `overflow-wrap: anywhere`

### Status Component

Generic API:
```typescript
interface StatusProps {
  kind: 'info' | 'warning' | 'error' | 'debug';
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}
```

Built-in variants:
- `Message.StatusError` — adapts to `MessageError` type from metadata
- `Message.StatusCancelled` — fixed content with Continue/Retry actions

Placement: after content, before footer. Precedence: `cancelled > error > none`.

### Footer Responsive Behavior

Breakpoint: `768px` via `useMediaQuery` hook (exists at `apps/web/src/hooks/utils/use-media-query.tsx`).

| Viewport | Actions Visible | Stats Visible |
|----------|-----------------|---------------|
| Desktop (>=768) | primary + secondary | primary inline |
| Mobile (<768) | primary only | "(i)" button → popover |

Overflow goes into "More" dropdown menu (DropdownMenu from shadcn).

Desktop: footer hidden until hover (opacity transition, keeps height footprint).
Mobile: footer always visible.

### Copy Feedback Pattern

Copy button uses icon swap pattern (already exists in codebase):
```typescript
const [copied, setCopied] = useState(false);
const handleCopy = () => {
  copyToClipboard(content);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
// Render: copied ? <CheckIcon /> : <CopyIcon />
```

### Accessibility

- All actions have `aria-label`
- Toggle has `aria-expanded`
- Keyboard navigation on context menus (Radix handles this)
- Long-press handled by Radix `ContextMenu` primitives
- Focus ring on all interactive elements

### Demo Page

Location: `apps/web/src/routes/components/_components/messages.tsx`

Current state is broken (not responsive, crops on mobile, weird zoom). Nuke and rebuild.

Requirements:
- Responsive layout that works on all screen sizes
- Interactive controls panel:
  - isThreadStreaming toggle
  - isLastMessage toggle
  - reasoning present toggle
  - response present toggle
  - previewLines slider (1-5)
  - header state override (A/B/C/D)
  - long-content toggle
  - error/cancelled status selector
  - mobile width simulation toggle
- Fake streaming simulation:
  - Word chunking with timer (~80ms per chunk)
  - 500ms pause between reasoning and response
- Multiple test cases visible simultaneously

## Out of Scope

- Backend liveStatus expansion or new streaming substatus
- Implementing real action logic (export formats, model picker, retry strategies)
- New error kinds beyond current `MessageError` union
- Full i18n system (use hardcoded English, structure for future i18n)
- Tool-call/agent-specific statuses beyond current metadata
- Global design system changes outside message components
- Unit test infrastructure setup
- Integration tests

## Further Notes

### File References

| Purpose | Path |
|---------|------|
| Canonical types | `packages/ai/src/types/uiMessage.ts` |
| Error enum | `packages/backend/convex/schema.ts` (ChatErrorMetadata) |
| Backend stream | `packages/api/src/handlers/chat.handler.ts` |
| Current L3 | `apps/web/src/components/chat/chat-message.tsx` |
| Legacy L3 | `apps/web/src/components/chat/chat-messages/*` |
| Current L2 fragments | `apps/web/src/components/ui-custom/chat/message-*.tsx` |
| Demo page | `apps/web/src/routes/components/_components/messages.tsx` |
| useMediaQuery | `apps/web/src/hooks/utils/use-media-query.tsx` |
| ai-elements Message | `.llms/git-references/ai-elements/packages/elements/src/message.tsx` |
| ai-elements Reasoning | `.llms/git-references/ai-elements/packages/elements/src/reasoning.tsx` |
| ai-elements Shimmer | `.llms/git-references/ai-elements/packages/elements/src/shimmer.tsx` |

### Skills to Use

- `vercel-composition-patterns` for compound API design
- `shadcn-ui` for dropdown/context menu/tooltip patterns
- `vercel-react-best-practices` for memoization
- `ai-sdk` + Context7 `/vercel/ai` docs for UIMessage patterns

### Existing Patterns to Reuse

- Copy feedback: `apps/web/src/components/chat/chat-message.tsx:54-112`
- Code block: `apps/web/src/components/ui-custom/chat/code-block.tsx`
- Model selector dropdown: `apps/web/src/components/ui-custom/chat/model-selector.tsx`

---

## Task List

Each task has:
- **Files**: What to create/modify/delete
- **Verify**: How agent/user confirms completion (manual review)
- **Depends**: Task dependencies

---

### T1: Create L2 Message Compound API (Wrap L1)

**Goal**: Create thin wrappers around L1 ai-elements under a unified namespace.

**Files to create**:
- `apps/web/src/components/ui-custom/chat/message.tsx`

**Implementation details**:
1. Import L1 primitives from `@/components/ai-elements/message` and `@/components/ai-elements/reasoning`
2. Create thin wrapper components that apply app styling via `cn()`:
   - `MessageRoot` wraps `Message` from ai-elements
   - `MessageContent` wraps `MessageContent` from ai-elements
   - `MessageResponse` wraps `MessageResponse` from ai-elements
   - `MessageActions` wraps `MessageActions` from ai-elements
   - `MessageAction` wraps `MessageAction` from ai-elements
   - `MessageToolbar` wraps `MessageToolbar` from ai-elements
   - `MessageReasoning` wraps `Reasoning` from ai-elements
   - `MessageReasoningTrigger` wraps `ReasoningTrigger` from ai-elements
   - `MessageReasoningContent` wraps `ReasoningContent` from ai-elements
3. Memoize all wrappers with `React.memo`
4. Export as `Message` namespace object
5. Export types via `ComponentProps<typeof ...>`
6. **DO NOT**: create custom context, re-export existing L2 fragments, define app-specific types

**Verify**: 
- LSP shows no type errors
- No linter errors (no barrel exports)
- Each export is a thin wrapper around L1, not a reimplementation

**Depends**: None

---

### T2: Verify/Enhance ThinkingBlock for A/B/C/D States

**Goal**: Verify existing `ThinkingBlock` meets PRD requirements, enhance if needed.

**Files to review/modify**:
- `apps/web/src/components/ui-custom/chat/thinking-block.tsx` (already exists)

**NOTE**: `ThinkingBlock` already implements:
- A/B/C/D state machine via `isStreaming` + `hasResponseText` props
- Preview with fade mask
- Toggle persistence
- Shimmer animation
- `min-h-6` header

**Verification checklist**:
1. [ ] State A: "Thinking..." shimmer shows when no text
2. [ ] State B: "Reasoning..." shimmer + preview when streaming reasoning
3. [ ] State C: "Thought for Xs" static when reasoning ended
4. [ ] State D: Nothing renders when no reasoning exists
5. [ ] Toggle state persists across B→C transition
6. [ ] No layout shift between states
7. [ ] Preview shows last N lines with fade mask
8. [ ] Expanded shows full content in subtle box

**If gaps found**: Enhance `ThinkingBlock`, do NOT create new component

**Depends**: T1

---

### T3: Verify/Enhance ChatMessageContent Overflow Guards

**Goal**: Verify existing content components handle overflow correctly.

**Files to review/modify**:
- `apps/web/src/components/ui-custom/chat/message-content.tsx` (already exists)
- `apps/web/src/components/ui-custom/chat/message.tsx` (Message.Response wrapper)

**NOTE**: `ChatMessageContent` already implements role-based styling. `Message.Response` wraps `MessageResponse` from ai-elements.

**Verification checklist**:
1. [ ] Long code blocks scroll horizontally (not break layout)
2. [ ] Long single words wrap (not overflow)
3. [ ] Tables don't break container
4. [ ] User messages have bubble styling
5. [ ] Assistant messages are transparent

**If gaps found**: Add overflow styles to existing components:
- `max-w-full overflow-x-auto` for horizontal scroll
- `break-words` / `overflow-wrap: anywhere` for long tokens

**Depends**: T1

---

### T4: Verify/Enhance ChatStatusMessage Components

**Goal**: Verify existing status components meet PRD requirements.

**Files to review/modify**:
- `apps/web/src/components/ui-custom/chat/message-status.tsx` (already exists)
- `apps/web/src/components/ui-custom/chat/primitives/status-message.tsx` (base primitive)

**NOTE**: Already implements:
- `ChatStatusMessage.*` compound (Root, Header, Icon, Title, Content, Description, Actions, Footer)
- `ChatMessageErrorBlock` with retry actions
- `ChatMessageCancelledBlock` with continue/retry actions
- Tone-based styling (error=red, cancelled=amber)
- i18n support structure

**Verification checklist**:
1. [ ] Error block shows correct icon and styling
2. [ ] Cancelled block shows correct icon and styling
3. [ ] Actions render and are clickable
4. [ ] Error metadata is correctly displayed
5. [ ] Retry/Continue buttons work

**If gaps found**: Enhance existing components, do NOT create new ones

**Depends**: T1

---

### T5: Verify/Enhance Footer Responsive Behavior

**Goal**: Verify existing footer components meet PRD responsive requirements.

**Files to review/modify**:
- `apps/web/src/components/ui-custom/chat/message-footer.tsx` (already exists)
- `apps/web/src/components/ui-custom/chat/message-actions.tsx` (already exists)
- `apps/web/src/components/ui-custom/chat/message-action.tsx` (already exists)
- `apps/web/src/components/ui-custom/chat/message-infos.tsx` (already exists)
- `apps/web/src/components/ui-custom/chat/message-info.tsx` (already exists)

**NOTE**: Already implements:
- `ChatMessageFooter` with `revealOnHover` and `stackOnMobile` props
- `ChatMessageAction` with tooltip and context menu support
- `ChatMessageInfos` / `ChatMessageInfo` for stats display

**Verification checklist**:
1. [ ] Footer hidden on desktop until hover
2. [ ] Footer always visible on mobile
3. [ ] Actions have tooltips
4. [ ] Context menu works on right-click
5. [ ] Stats display correctly
6. [ ] Copy feedback (checkmark) works

**Gaps to potentially address**:
- [ ] "More" overflow menu for small screens (may need implementation)
- [ ] "(i)" button for stats popover on mobile (may need implementation)
- [ ] Priority-based action filtering (may need implementation)

**Depends**: T1, T3

---

### T6: Rebuild Demo Page

**Goal**: Fully interactive component showcase.

**Files to modify**:
- `apps/web/src/routes/components/_components/messages.tsx`

**Implementation details**:
1. Nuke existing content, start fresh
2. Responsive layout: max-w-4xl centered, padding, works on mobile
3. Controls panel (sticky or collapsible sidebar on desktop, top on mobile):
   - Checkbox: isThreadStreaming
   - Checkbox: isLastMessage
   - Checkbox: hasReasoning
   - Checkbox: hasContent
   - Slider: previewLines (1-5)
   - Radio: forceState (auto/A/B/C/D)
   - Checkbox: longContent
   - Radio: status (none/error/cancelled)
   - Checkbox: simulateMobile
4. Message preview area:
   - Renders Message with current control state
   - Width constrained when simulateMobile checked
5. Fake streaming simulation:
   - "Start stream" button
   - Words chunk in at ~80ms
   - 500ms pause between reasoning and content
   - Sets isThreadStreaming during stream
6. Multiple static examples section:
   - User message
   - Assistant completed
   - Assistant with reasoning
   - Error state
   - Cancelled state
   - Long content

**Verify**:
- Page loads without errors
- All controls affect message preview
- Streaming simulation works
- Mobile simulation constrains width
- No layout overflow on real mobile

**Depends**: T1, T2, T3, T4, T5

---

### T7: Refactor L3 Adapter to Use Unified L2

**Goal**: Update L3 to compose L2 components cleanly.

**Files to modify**:
- `apps/web/src/components/chat/chat-message.tsx` (refactor, not rewrite)

**Files to keep** (these are L2 fragments, not legacy):
- `apps/web/src/components/ui-custom/chat/message-action.tsx` ✓
- `apps/web/src/components/ui-custom/chat/message-actions.tsx` ✓
- `apps/web/src/components/ui-custom/chat/message-content.tsx` ✓
- `apps/web/src/components/ui-custom/chat/message-footer.tsx` ✓
- `apps/web/src/components/ui-custom/chat/message-info.tsx` ✓
- `apps/web/src/components/ui-custom/chat/message-infos.tsx` ✓
- `apps/web/src/components/ui-custom/chat/message-status.tsx` ✓
- `apps/web/src/components/ui-custom/chat/thinking-block.tsx` ✓

**Implementation details**:
1. Import `Message` from `@/components/ui-custom/chat/message` (L1 wrappers)
2. Import L2 fragments directly: `ThinkingBlock`, `ChatMessageFooter`, `ChatStatusMessage`, etc.
3. Extract content/reasoning from `message.parts`
4. Compute derived signals (isReasoningStreaming, reasoningEnded, etc.)
5. Pass props to L2 components (no context injection)
6. Wire actions: copy, retry, continue, branch
7. Compose based on role:
   - User: `ChatMessageContent` + minimal `ChatMessageFooter`
   - Assistant: `ThinkingBlock` + `ChatMessageContent` + status + `ChatMessageFooter`
8. Memoize appropriately

**Verify**:
- Real chat messages render correctly
- Streaming works end-to-end
- Actions fire correctly
- Clean composition with no redundant code

**Depends**: T1, T2, T3, T4, T5, T6

---

### T8: Cleanup Unused Legacy Code

**Goal**: Remove genuinely unused code after migration verified.

**Files to potentially delete** (verify unused first):
- `apps/web/src/components/chat/chat-messages/*.tsx` (legacy folder if exists)
- `apps/web/src/components/chat/chat-message-status.tsx` (if duplicates message-status.tsx)
- Any orphaned imports

**Implementation details**:
1. Search codebase for imports from potential delete paths
2. Verify files are truly unused (not just renamed)
3. Delete only files with zero imports
4. Verify no broken imports after deletion

**NOTE**: Do NOT delete the L2 fragments (message-*.tsx in ui-custom/chat/). These are the design system components we're using.

**Verify**:
- LSP shows no import errors
- App builds/runs
- Demo page works
- Real chat works

**Depends**: T7

---

## Task Dependency Graph

```
T1 ──────┬──────────────────────────────────────┐
         │                                      │
         ├── T2 (header/reasoning)              │
         │                                      │
         ├── T3 (content)                       │
         │                                      │
         ├── T4 (status)                        │
         │                                      │
         └── T5 (footer) ───────────────────────┤
                                                │
                                                ├── T6 (demo page)
                                                │
                                                └── T7 (L3 adapter) ── T8 (cleanup)
```

T2, T3, T4 can run in parallel after T1.
T5 depends on T3 (for content context).
T6 depends on T1-T5.
T7 depends on T6 (verify L2 works in demo first).
T8 depends on T7.

---

## Definition of Done

- [ ] T1-T8 all complete
- [ ] Demo page shows: A/B/C/D header states, toggle persistence, error/cancelled, mobile layout
- [ ] Real chat works with new components
- [ ] No legacy message imports remain
- [ ] No LSP errors
- [ ] Code follows 3-layer architecture (L2 has no app imports)
