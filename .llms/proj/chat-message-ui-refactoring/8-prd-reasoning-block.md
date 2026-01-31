# PRD: Reasoning Block (L2 + L3)

## Problem Statement

Reasoning UX is currently a placeholder with no performant collapsed preview and no final L2 API. This blocks shipping the message UI with stable reasoning behavior and prevents later plug-and-play improvements.

## Solution

Build a dedicated L2 Reasoning compound and finish the L3 reasoning part so it plugs into the existing message PRD without changing its composition or state machine. The key deliverable is a performant collapsed preview that shows the latest N lines (visual reserved block height) of streaming reasoning text with minimal layout shift.

## User Stories

1. As a user, I want a collapsed reasoning preview while the assistant thinks, so I can glance at progress without expanding.
2. As a user, I want the preview to show the latest lines, so I see the most recent reasoning.
3. As a user, I want the preview to stop showing once response starts, so the message feels continuous.
4. As a user, I want to expand reasoning, so I can read the full chain.
5. As a user, I want expand/collapse to be smooth and stable, so it feels intentional.
6. As an accessibility user, I want the reasoning toggle to be keyboard and screen-reader friendly.
7. As a developer, I want a stable L2 Reasoning API, so message layout stays unchanged.
8. As a developer, I want the preview to be performant, so streaming does not cause jank.

## Implementation Decisions

### Scope and Integration

- Implement the L2 Reasoning compound and upgrade the L3 reasoning part.
- Prefer L1 ai-elements Reasoning primitives for Root/Trigger/Content; only add what L1 does not cover (Preview + styling).
- Do not change message layout, header state machine, or other subcomponents from the core message PRD.
- The L2 Reasoning API must be compatible with the placeholder API from the core message PRD.

### L2 Reasoning API (App-Agnostic)

Expose a single namespace object with these parts:

- `Reasoning.Root` with controlled + uncontrolled open state:
  - `open`, `defaultOpen`, `onOpenChange`
  - `isStreaming` for styling and internal duration tracking
- `Reasoning.Trigger`: toggle button only (no label logic inside L2)
- `Reasoning.Preview`: collapsed preview container with `lines` prop (default 2)
- `Reasoning.Content`: expanded content container

Implementation guidance:

- `Reasoning.Root`, `Reasoning.Trigger`, `Reasoning.Content` should wrap the ai-elements Reasoning primitives.
- `Reasoning.Preview` is custom; it should accept children and apply preview-only layout (height, clipping, fade).

L2 may accept L1 contract types if needed, but must not accept app types.

### L3 Reasoning Part (Message Feature)

L3 `_parts/reasoning` owns all behavior:

- Inputs: `reasoningText`, derived flags from message PRD (`isReasoningStreaming`, `reasoningEnded`, `hasReasoningText`), `previewLines`, and message timing metadata (optional).
- Toggle state stored in L3 and passed to `Reasoning.Root` as `open`.
- Rendering rules:
  - Collapsed + reasoning streaming -> render `Reasoning.Preview`
  - Collapsed + reasoning ended -> no preview
  - Expanded -> render `Reasoning.Content` regardless of streaming
  - No reasoning text -> render nothing

Header label integration (for message header):

- Duration text derives from message timing metadata.
- If timing metadata missing, fallback label: `"Thought for a few minutes"`.

### Collapsed Preview (Performance-Critical)

Preview must show the latest N visual lines without per-frame measurement.

Preferred approach (CSS-only, no measurement):

- `Reasoning.Preview` sets a fixed height based on `line-height * lines`.
- Render reasoning markdown (SmoothMarkdown) inside, align bottom, clip overflow at top.
- Apply a subtle top fade via overlay gradient (avoid `mask-image` for baseline support).
- Use `whitespace-pre-wrap` so newlines are preserved.

This avoids slicing text and avoids DOM measurement during streaming.

### Expanded Content

- Expanded reasoning uses the same markdown renderer used for message response (SmoothMarkdown).
- Expanded content uses subtle container styling (border + muted background) per design guidelines.

Markdown rendering strategy:

- Reasoning is markdown in both preview and expanded states.
- Do not render two SmoothMarkdown instances at the same time; only render one (preview or expanded).
- If toggle remount causes noticeable jank, consider keeping a single SmoothMarkdown instance mounted and switching wrapper styles (React Activity is allowed if needed).

### Styling and UX

- Minimal, high-end styling: muted text, subtle mask, no heavy borders in preview.
- Expanded block: mild separation from response text.
- Toggle is icon-only, aligned with header rules from message PRD.

### Accessibility

- `Reasoning.Trigger` is a button with `aria-expanded` and focus ring.
- Preview is `aria-hidden` to avoid duplicate screen-reader content (expanded content is the accessible source).

### Compatibility

- No API changes to the message PRD’s reasoning state machine.
- No changes to message layout or footer.

## Testing Decisions

- Ask a review sub-agent to review your changes against the prd and task picked.
- Ask a review sub-agent performance reviewer to review your changes based on react skills and best practices to make sure we are following the best practices in terms of performance and reactivity in react19.
- Ask a review sub-agent accessibility reviewer to review your changes based on accessibility best practices to make sure we are following the best practices in terms of accessibility.
- Manual QA in demo page:
  - Streaming preview shows latest lines
  - Preview disappears when response begins
  - Expanded content renders full markdown
  - Toggle is keyboard accessible
- If unit tests exist, add a small test for preview height calculation given `lines` and `line-height`.

## Out of Scope

- Changing the reasoning header state machine (A/B/C/D)
- Changing message layout or other subcomponents
- Advanced animations beyond simple expand/collapse
- New reasoning data sources or backend changes

## Further Notes

References:

- Core message PRD: `.llms/proj/chat-message-ui-refactoring/5-prd-message-ui.md`
- Requirements: `.llms/proj/chat-message-ui-refactoring/1-ui-requirements.md`
- Component guidelines: `apps/web/src/components/README.md`
- ai-elements Reasoning docs (Reasoning, Trigger, Content, isStreaming): Context7 `/vercel/ai-elements`

Target artifacts:

- L2 Reasoning: `apps/web/src/components/ui-custom/chat/reasoning.tsx`
- L3 reasoning part: `apps/web/src/components/chat/message/_parts/reasoning.tsx`
- Demo page: `apps/web/src/routes/components/_components/messages.tsx`

Task List:

- T1: Implement L2 Reasoning compound with Preview and Content
- T2: Implement CSS-only preview clipping (bottom-aligned, N lines)
- T3: Wire L3 reasoning behavior + toggle state
- T4: Update demo page scenarios for preview/expanded states

## Definition of Done

- Collapsed preview shows latest N lines while streaming
- Preview disappears when response starts
- Expanded reasoning renders full markdown
- No changes required in message layout or state machine
