# PRD: Message UI Refactoring

## Problem Statement

Current chat message UI split across two incomplete iterations, messy layering, inconsistent behavior, missing requirements (reasoning header states, footer overflow, status blocks), and poor demo page. Need a stable, composable, high-perf message system aligned to the 3-layer architecture and ai-elements primitives.

## Solution

Refactor into:
- **L2**: Single-file compound Message API (shadcn-like) in `ui-custom/chat/message.tsx`
- **L3**: Adapter that maps app state + MyUIMessage to L2 in `chat/chat-message.tsx`
- Clean demo page for all states

Implement reasoning header state machine A/B/C/D with zero layout shift, collapsible reasoning preview, streamed content via SmoothMarkdown, composable status blocks, and responsive action/stats footer with More menus. Remove legacy implementations after migration.

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
13. As a user, I want retry/fork/export actions (UI only, mocked).
14. As a user, I want action tooltips, so buttons are clear.
15. As a user, I want right-click or long-press actions, so advanced actions are discoverable.
16. As a user, I want a "More actions" menu on small screens, so UI stays uncluttered.
17. As a user, I want a "More stats" menu on small screens, so stats stay available.
18. As a user, I want footer visibility on hover desktop, so UI stays minimal.
19. As a user, I want footer always visible on mobile, so actions are accessible.
20. As a user, I want message stats (TTFT, tokens, model) when available.
21. As a developer, I want a single L2 compound API, so L3 usage is readable.
22. As a developer, I want no barrel exports, so lint rules are satisfied.
23. As a developer, I want no direct edits in L1 registries, so upgrades are easy.
24. As a developer, I want memoized subparts, so streaming does not re-render heavy UI.
25. As a developer, I want a dedicated demo page for message states, so UI iteration is fast.
26. As a developer, I want old message code removed safely, so maintenance improves.
27. As a designer, I want subtle, minimal styling, so it feels high-end.
28. As an accessibility user, I want ARIA compliant actions and menus.

## Implementation Decisions

- Use existing L1 ai-elements Message primitives; do not modify L1 code.
- L2 Message is a single-file compound component exporting Root/Content/Header/Reasoning/Response/Status/Footer/Actions/Action/Stats/Stat/More variants.
- L3 adapter maps MyUIMessage + actions to L2 context; no app hooks in L2.
- Reasoning-end derived from message parts + thread streaming state (no backend change).
- Reasoning streaming detection: `isThreadStreaming && isLastMessage && lastPartType === "reasoning"`.
- Latch "text started" in a ref to keep reasoning-ended stable after first text tokens.
- SmoothMarkdown used for streamed text, based on ai-elements MessageResponse.
- Footer uses priority (primary/secondary/tertiary) and More menu on small screens.
- Breakpoint at 768px via useMediaQuery hook.
- Status system: composable primitive, then Error and Cancelled variants.
- Demo page rebuilt with fake streaming and controls for all states.
- Remove legacy code only after imports updated.
- No forwardRef; use ref prop pattern (React 19).

## Testing Decisions

- Focus on external behavior, not implementation details.
- Small unit tests for reasoning-state derivation and footer priority partitioning.
- Manual QA via demo page: all states A/B/C/D, collapsed/expanded, hover vs mobile, long content, error/cancelled.
- User performs manual verification after each iteration.

## Out of Scope

- Backend liveStatus expansion or new streaming substatus.
- Implementing real action logic (export formats, model picker, retry strategies).
- New error kinds or full i18n system.
- Tool-call/agent-specific statuses beyond current metadata.
- Global design system changes outside message components.

## Further Notes

### Context and References

- Canonical types: `packages/ai/src/types/uiMessage.ts` (MyUIMessage, MyMetadataHelper)
- Canonical error enum: `packages/backend/convex/schema.ts` (ChatErrorMetadata)
- Backend stream parts: `packages/api/src/handlers/chat.handler.ts`
- Current L3 message: `apps/web/src/components/chat/chat-message.tsx`
- Legacy L3 iteration: `apps/web/src/components/chat/chat-messages/*`
- Current L2 fragments (to replace): `apps/web/src/components/ui-custom/chat/message-*.tsx`
- SmoothMarkdown source: `apps/web/src/components/chat/chat-messages/smooth-streamed-markdown.tsx`
- Demo page to rebuild: `apps/web/src/routes/components/_components/messages.tsx`
- useMediaQuery hook: `apps/web/src/hooks/utils/use-media-query.tsx`

### ai-elements Reference (read-only)

- Repo root: `.llms/git-references/ai-elements`
- Base Message primitives: `.llms/git-references/ai-elements/packages/elements/src/message.tsx`
- Reasoning component: `.llms/git-references/ai-elements/packages/elements/src/reasoning.tsx`
- Streaming demo pattern: `.llms/git-references/ai-elements/packages/examples/src/demo-chatgpt.tsx`

### Skills to Use

- `vercel-composition-patterns` for compound API and avoiding boolean props
- `shadcn-ui` for dropdown/context menu/tooltip patterns
- `vercel-react-best-practices` for memoization and rerender control
- `ai-sdk` skill and Context7 `/vercel/ai` docs for useChat/UIMessage

### State Machine (A/B/C/D)

- **A = "Thinking..."**: No meaningful reasoning or response text. Header renders shimmer.
- **B = "Reasoning..."**: Reasoning streaming. Header renders shimmer + toggle. Collapsed preview shows last N lines.
- **C = "Thought for Xs"**: Reasoning ended, response started. Header static. Preview disappears. Expanded stays if user opened.
- **D = no header**: Response started without reasoning. Header absent.

### Signal Derivation

Inputs from L3: isThreadStreaming, isLastMessage, message.parts

Derived:
- hasReasoningText, hasText, lastPartType
- isReasoningStreaming = isThreadStreaming && isLastMessage && lastPartType === "reasoning"
- hasTextStartedRef (latched) prevents flip-flop
- reasoningEnded = hasReasoningText && hasTextStartedRef

### Header Visual Spec

- "Thinking..."/"Reasoning..." use Shimmer (1s duration)
- Single line row with min-h-6, text-sm
- Toggle icon always reserved width to prevent CLS

### Reasoning Preview Spec

- Default previewLines = 2, line height = 1.25rem
- Shows last N wrapped lines with vertical fade mask
- Expanded shows full text in subtle box (border + muted bg)

### Footer Schema

Action fields: id, icon, label, tooltip, onClick, menuItems, contextItems, priority (primary/secondary/tertiary)

- Desktop (>=768px): primary + secondary visible; tertiary in More
- Mobile (<768px): primary only; secondary + tertiary in More
- Long-press maps to context menu via Radix primitives

### Stats Mapping

Show when data exists: sentAt, modelId, outputTokens, totalTokens, reasoningTokens, cachedInputTokens, TTFT, TTFM, timeToLastToken, reasoningDuration, TPS, apiPrice

### Status Placement

After content, before footer. Precedence: cancelled > error > none.

### Content Overflow

max-w-full + overflow-x-auto on code/tables; break-words for long tokens.

### Accessibility

- aria-label on all actions
- Keyboard navigable context menus
- Long-press handled by Radix primitives
- Toggle has aria-expanded and focus ring

### Demo Page Requirements

Location: `apps/web/src/routes/components/_components/messages.tsx`

Controls: isThreadStreaming, isLastMessage, reasoning present, response present, previewLines slider, header state override, long-content, error/cancelled, mobile width toggle

Fake streaming: word chunking with timer, 500ms pause between reasoning and response.

## Task List

- T1 [Architecture] Create L2 Message compound API. Verify: L3 can render basic message.
- T2 [Reasoning] Implement A/B/C/D header + preview + toggle + latch. Verify: no layout shift.
- T3 [Content] Integrate SmoothMarkdown and overflow guards. Verify: long content contained.
- T4 [Status] Implement Status primitive + Error/Cancelled + L3 adapter. Verify: callouts render.
- T5 [Footer] Implement action/stat schema + More menus + breakpoints. Verify: layouts correct.
- T6 [Demo] Rebuild demo page with streaming simulation + controls. Verify: all states work.
- T7 [Cleanup] Remove legacy message files after import audit. Verify: no unused files.

## Definition of Done

- All tasks T1-T7 complete
- Demo page shows A/B/C/D, reasoning states, error/cancelled, mobile layout
- No legacy message imports remain
