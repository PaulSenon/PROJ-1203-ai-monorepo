# Message UI Requirements

This document outlines the requirements for the message UI refactoring, describing the big picture composition needed.

Message UI component is based on ai-elements/message (L1) with customizations built in L2 Design System.
Here we describe the final aspect depending on the main states (reasoning, response, status, error, owner).

## User Message (owner = user)

User messages are simpler:
- Content block (same as ai-elements/message)
- Configurable footer with:
  - Actions: copy (markdown/raw), retry, fork, edit
  - Stats: sent at, tokens
- Never streamed
- Right-aligned (end-aligned for RTL support)

## Assistant Message (owner = assistant)

Assistant messages are more complex with a header that has 4 states:

### Header State Machine

- **A**: No reasoning or response text yet → "Thinking..." (shimmer)
- **B**: Reasoning streaming → "Reasoning..." (shimmer) + ">" toggle + collapsed reasoning block
- **C**: Reasoning ended → "Thought for Xs" + ">" toggle + collapsed preview disappears for text content
- **D**: No reasoning, response text only → NO HEADER (text streams directly)

### State Transitions

- A → B: First reasoning content tokens stream in
- B → C: Reasoning streaming ends (derive from parts + thread streaming state)
- A → D: Response text starts streaming directly without reasoning

### Layout Stability Requirements

The header must be super stable and never trigger layout shift:
- "Thinking..." to NOTHING: First text tokens stream in place of "Thinking..." text
- "Thinking..." to "Reasoning...": Same footprint on first line (just adding toggle), collapsed reasoning block adds fixed-height space below
- "Reasoning..." to "Thought for Xs": Text replacement + shimmer removal. Collapsed state shows NOTHING instead of preview (expanded UI unchanged)
- Collapsible state persists across transitions (collapsed by default, stays open if user opened it)

## Reasoning Block

Dedicated component (similar to ai-elements/reasoning):

**Collapsed state**:
- Fixed number of lines preview without visual container
- Always shows last N lines streaming in
- Performance-conscious implementation (room for interpretation)

**Expanded state**:
- Full reasoning content
- Subtle container box to distinguish from response text

## Main Content Block

Same as ai-elements/message-response:
- Markdown content must never expand outside message component
- Handle long codeblocks, long tables, etc.

## Status Component

After text content, a MessageStatus component for errors/cancellation:

**Generic API**:
- Kind: info (blue), warning (yellow), error (red), debug (gray)
- Icon, title, description
- Optional action buttons

**Cancelled status**:
- Warning kind, "cancelled" icon
- Title: "Cancelled"
- Description: "The message was cancelled by the user."
- Actions: "Continue" or "Retry" with model picker dropdown

**Error status** (procedural):
- Adapts to typed error metadata from MyUIMessage
- Error kinds: AI_API_ERROR, UNKNOWN_ERROR, MAX_OUTPUT_TOKENS_EXCEEDED
- Procedural title, description, icon, and actions based on error kind and params
- Supports i18n localization

## Footer

Configurable footer with complexity for breakpoints and customization:

**Actions**: copy (markdown/raw), retry, fork, export

**Stats**: sent at, output tokens, speed (tok/s), TTFT, TTFM (if reasoning), time to last token, reasoning duration, model id, api price (with tooltip breakdown)

### Action Button Behaviors

- Basic: click → action, hover → tooltip
- Submenu: click → dropdown
- Context action: click → default action, right-click → dropdown with sub-actions
  - Example: Copy does raw copy on click, right-click shows "copy as markdown", "copy as raw", "copy as pdf", etc.
- Export: No direct onclick, shows dropdown with export options
- Retry/Fork: Dropdown with "retry with same" + model picker submenu

### Responsive Behavior

- "More actions" button groups actions that don't fit
- Desktop: First X visible, last Y in "more actions"
- Mobile: Only Z primary actions visible, rest in "more actions"
- Stats: Desktop shows inline, mobile shows "(i)" button for "more stats" popover

### Accessibility

- ARIA compliant
- Touchscreen support (right-click → long-press, hover → touch)
- Desktop: Footer hidden on non-hover (keeps footprint), visible on hover
- Mobile: Footer always visible with fewer elements (rest in "more" menus)

## Alignment

- User messages: Right-aligned
- Assistant messages: Left-aligned, can be streamed
