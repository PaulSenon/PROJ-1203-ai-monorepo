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
- **L2 (App-Agnostic)**: Single file `ui-custom/chat/message.tsx` exporting `Message.*` namespace. No app hooks, no app types.
- **L3 (App Layer)**: `chat/chat-message.tsx` maps MyUIMessage + hooks to L2 context.

### L2 Interface Sketch

```typescript
// Context value injected by Message.Provider
interface MessageContextValue {
  state: {
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string;
    isReasoningStreaming: boolean;
    reasoningDuration?: number; // ms
  };
  meta?: {
    sentAt?: number;
    modelId?: string;
    timing?: {
      ttft?: number;      // time to first token (ms)
      ttfm?: number;      // time to first message token (ms, after reasoning)
      duration?: number;  // total generation time (ms)
    };
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      reasoningTokens?: number;
      cachedInputTokens?: number;
    };
  };
}

// Action schema for footer
interface MessageActionDef {
  id: string;
  icon: ReactNode;
  label: string;
  tooltip: string;
  priority: 'primary' | 'secondary' | 'tertiary';
  onClick?: () => void;
  menuItems?: MessageMenuItem[];    // dropdown on click
  contextItems?: MessageMenuItem[]; // right-click/long-press
}

interface MessageMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

// Stat schema for footer
interface MessageStatDef {
  id: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  tooltip?: string;
  priority: 'primary' | 'secondary';
}
```

### L2 Compound Exports

```typescript
export const Message = {
  Provider,     // Context injection point
  Root,         // Container with role-based alignment
  Header,       // Reasoning header (A/B/C/D states)
  Reasoning,    // Collapsible reasoning block
  Content,      // Markdown content wrapper
  Status,       // Error/warning/info callout
  Footer,       // Actions + stats container
  Actions,      // Action buttons container
  Action,       // Single action button
  Stats,        // Stats container
  Stat,         // Single stat display
};
```

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

### T1: Create L2 Message Compound API Skeleton

**Goal**: Establish the L2 compound component structure with stub implementations.

**Files to create**:
- `apps/web/src/components/ui-custom/chat/message.tsx`

**Implementation details**:
1. Create context with `MessageContextValue` interface
2. Create `Message.Provider` that accepts state/meta/actions
3. Create stub components: `Root`, `Header`, `Reasoning`, `Content`, `Status`, `Footer`, `Actions`, `Action`, `Stats`, `Stat`
4. Each stub renders placeholder div with component name for now
5. Export as `Message` namespace object
6. `Root` should apply role-based alignment (user = end, assistant = start)

**Verify**: 
- LSP shows no type errors
- Can import `Message` from `@/components/ui-custom/chat/message` in any file
- Demo page (T6) can render `<Message.Root>` with visible output

**Depends**: None

---

### T2: Implement Reasoning Header + Preview + Toggle

**Goal**: Full A/B/C/D state machine with stable layout.

**Files to modify**:
- `apps/web/src/components/ui-custom/chat/message.tsx`

**Implementation details**:
1. `Message.Header` computes state from context (A/B/C/D)
2. Import and use `<Shimmer>` from ai-elements for "Thinking..."/"Reasoning..." text
3. Header row: `flex items-center min-h-6 text-sm text-muted-foreground`
4. Toggle button: fixed width slot (16px), uses ChevronDown icon, rotates when open
5. Toggle has `aria-expanded`, focus ring
6. `Message.Reasoning` uses Radix Collapsible (or ai-elements Reasoning primitive)
7. Collapsed preview: last N lines with fade mask, computed via CSS line-clamp or JS
8. Expanded: subtle box with border and muted bg
9. Latch toggle state in local state, persist across B→C transition
10. State D: render nothing (not even empty div)

**Verify**:
- Demo page shows all 4 states without layout shift
- Toggle works, persists across state transitions
- Shimmer animates
- Preview shows last lines with fade

**Depends**: T1

---

### T3: Implement Content with Overflow Guards

**Goal**: Markdown content that never breaks layout.

**Files to modify**:
- `apps/web/src/components/ui-custom/chat/message.tsx`

**Implementation details**:
1. `Message.Content` wraps children (typically `<MessageResponse>` from ai-elements)
2. Apply: `max-w-full overflow-x-auto` for horizontal scroll on wide content
3. Apply: `break-words overflow-wrap-anywhere` for long tokens
4. Memoize via `React.memo` with shallow children comparison
5. Role-based styling: user = bubble with bg, assistant = transparent

**Verify**:
- Demo page with long code block scrolls horizontally
- Demo page with long single word wraps
- No layout breakout

**Depends**: T1

---

### T4: Implement Status Primitive + Error/Cancelled Variants

**Goal**: Composable status callouts.

**Files to modify**:
- `apps/web/src/components/ui-custom/chat/message.tsx`

**Implementation details**:
1. `Message.Status` base: renders callout with kind-based styling (colors, icons)
2. Kinds: info (blue), warning (amber), error (red), debug (gray)
3. Layout: icon + title row, optional description below, optional actions slot
4. `Message.StatusError`: reads error from context.meta, renders procedural content
5. `Message.StatusCancelled`: fixed content with action buttons slot
6. Use shadcn Alert or custom callout styling

**L3 adapter changes** (in T1 or separate):
- Map `message.metadata.liveStatus === 'error'` to show StatusError
- Map `message.metadata.liveStatus === 'cancelled'` to show StatusCancelled

**Verify**:
- Demo page shows error status with correct styling
- Demo page shows cancelled status
- Actions render and are clickable (console.log for now)

**Depends**: T1

---

### T5: Implement Footer with Actions/Stats + Responsive Behavior

**Goal**: Full footer with breakpoint-aware overflow.

**Files to modify**:
- `apps/web/src/components/ui-custom/chat/message.tsx`

**Implementation details**:
1. `Message.Footer`: container with `flex justify-between` layout
2. Desktop: `opacity-0 group-hover:opacity-100` transition (parent Root needs `group` class)
3. Mobile: always visible
4. `Message.Actions`: flex container for action buttons
5. `Message.Action`: button with tooltip, handles click/dropdown/context menu
6. Use shadcn `Tooltip`, `DropdownMenu`, `ContextMenu`
7. Priority-based partitioning: filter by viewport + priority, overflow to "More" menu
8. `Message.Stats`: flex container for stats
9. `Message.Stat`: icon + value + optional tooltip
10. Mobile: "(i)" button opens popover with all stats
11. Copy action: icon swap feedback pattern

**Verify**:
- Demo page shows footer on hover (desktop)
- Demo page shows footer always (mobile or simulated)
- More menu contains overflow items
- Copy shows checkmark briefly
- Tooltips work

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

### T7: Create L3 Adapter + Wire to App

**Goal**: Connect L2 Message to real app state.

**Files to modify**:
- `apps/web/src/components/chat/chat-message.tsx` (rewrite)

**Files to delete** (after verification):
- `apps/web/src/components/chat/chat-message-status.tsx`
- `apps/web/src/components/ui-custom/chat/message-action.tsx`
- `apps/web/src/components/ui-custom/chat/message-actions.tsx`
- `apps/web/src/components/ui-custom/chat/message-content.tsx`
- `apps/web/src/components/ui-custom/chat/message-footer.tsx`
- `apps/web/src/components/ui-custom/chat/message-info.tsx`
- `apps/web/src/components/ui-custom/chat/message-infos.tsx`
- `apps/web/src/components/ui-custom/chat/message-status.tsx`

**Implementation details**:
1. Import `Message` from L2
2. Import hooks: `useChatActive` (or equivalent for isThreadStreaming)
3. Extract content/reasoning from `message.parts`
4. Compute derived signals (isReasoningStreaming, reasoningEnded, etc.)
5. Map `message.metadata` to L2 meta interface
6. Wire actions: copy, retry, continue, branch (can be props or from hook)
7. Compose L2 components based on role:
   - User: simple content + minimal footer
   - Assistant: header + reasoning + content + status + full footer
8. Memoize appropriately

**Verify**:
- Real chat messages render correctly
- Streaming works end-to-end
- Actions fire (at least console.log)
- No legacy imports remain
- Delete legacy files only after all imports updated

**Depends**: T1, T2, T3, T4, T5, T6

---

### T8: Cleanup Legacy Files

**Goal**: Remove old code after migration verified.

**Files to delete**:
- `apps/web/src/components/chat/chat-messages/*.tsx` (entire folder if empty)
- Any orphaned imports

**Implementation details**:
1. Search codebase for imports from deleted paths
2. Update any remaining imports to use new L2/L3
3. Delete files
4. Verify no broken imports

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
