## Problem Statement

The chat message UI shows wrong states and layout shifts. Loader, reasoning, and response do not follow the intended behavior, causing CLS and confusing transitions. Headers are shown in the wrong situations. Footer layout and overflow control are not aligned with the product goals. Message content can break horizontal overflow (e.g., code blocks). Component layering is inconsistent, making refactors risky and reuse hard.

## Solution

Provide a stable, no-CLS message layout with clear states. Show a shimmer loader only when there is no reasoning content and no response text content. Render a reasoning header only if a reasoning part exists. If there is response text and no reasoning part, render no header at all. Render reasoning in a collapsed-first block with a shimmer header and a fixed-height preview while reasoning streams, then collapse to header-only once response starts. Keep expanded reasoning open with a subtle box. Render response content unchanged and preserve horizontal overflow behavior (including code blocks). Place error or cancelled status after any content (or alone if no content) with a bindable retry action. Provide a left-aligned, wrapping footer with primary and overflow actions and stats, with configurable overflow on mobile and desktop. Re-align components to the 4-layer architecture (immutable registries, custom primitives, custom composable components, app-level meta components) while preserving custom error messaging and translation behavior.

## User Stories

1. As a chat user, I see a shimmer "Thinking..." only when there is no reasoning content and no response text content.
2. As a chat user, I never see a blank assistant message placeholder.
3. As a chat user, I never see any header if there is response text and no reasoning part.
4. As a chat user, I can expand reasoning to read the full thought process.
5. As a chat user, collapsed reasoning stays compact and stable in height.
6. As a chat user, collapsed reasoning shows a sliding preview while reasoning is streaming.
7. As a chat user, when response text begins, the collapsed reasoning preview stops, and response text appears in the same visual space.
8. As a chat user, expanded reasoning stays open and does not auto-collapse when reasoning ends.
9. As a chat user, reasoning header text switches to "Thought for X" when done.
10. As a chat user, error or cancelled status shows after any partial content instead of replacing it.
11. As a chat user, error or cancelled status still shows even if no content arrived.
12. As a chat user, retry is available after a failure or cancellation.
13. As a chat user, footer actions are left aligned and easy to scan.
14. As a mobile user, I can access key actions without extra taps.
15. As a mobile user, I can access secondary actions in a "more" menu.
16. As a mobile user, I can see key stats inline and the rest via an info popover.
17. As a desktop user, I can still regroup secondary actions into a dropdown.
18. As a user, I experience no CLS when loader, reasoning, and response switch.
19. As a user, the main response rendering stays unchanged.
20. As a user, copy still works on assistant messages.
21. As a developer, I can configure which actions are primary vs overflow.
22. As a developer, I can configure which stats are primary vs overflow.
23. As a developer, I can reuse the reasoning block and footer in other message UIs.
24. As a developer, I can keep shadcn and ai-elements registries untouched.
25. As a developer, I can reuse the error UI logic and translations in the new layered system.
26. As an accessibility user, I can toggle reasoning with keyboard and accessible labels.
27. As QA, I can reproduce each state using a demo message set.
28. As a developer, I do not introduce horizontal overflow regressions in message content.
29. As a user, I can see actions on my own messages, distinct from assistant actions.

## Implementation Decisions

- State derivation: compute hasReasoningContent and hasTextContent from message parts with non-empty text. Do not depend on liveStatus for core rendering decisions. Show loader only if both are false. Render a reasoning header only if hasReasoningContent is true; if hasTextContent is true and hasReasoningContent is false, render no header.
- Reasoning rendering: always render reasoning component before response component to preserve order. No cross-component state coupling required; reasoning component decides whether to show preview based on "no response text yet".
- Reasoning collapsed header: 1-line height matches loader height. While reasoning is streaming and no response text exists, show shimmer "Reasoning..."; when response starts, switch to "Thought for X" label. Toggle uses a simple ">" affordance. No open/close animation.
- Reasoning preview row: fixed-height second row when collapsed and reasoning is streaming with no response text. Preview shows a sliding window of reasoning text. Use a cheap text window (tail slice) and a fade mask to imply motion. Preview height is a configurable prop (default 2 lines).
- Reasoning expanded: when open, show full reasoning in a subtle boxed container (border, soft background, padding). No transition animation; open state is user-controlled only and persists across streaming end.
- Response rendering: keep existing response component unchanged and in normal flow. When response begins, reasoning preview row is removed, letting response appear in the same visual space without CLS.
- Error/cancelled status: render inside message content after all parts (reasoning and response). Always render if status is error or cancelled, even when there is no content. Expose a status actions array at layer 4 (retry, retry with model, continue) and keep the error message builder + translations.
- Duration formatting: add a pure formatter for milliseconds with these rules: <1000ms shows "Nms"; <60s shows "Xs" with 1 decimal; <60m shows "Xm Ys"; <24h shows "Xh Ym"; otherwise "Xd Yh". Use a mock duration value for now; real metadata wiring is out of scope.
- Footer layout: left aligned, wrap enabled, actions first then stats. Provide an overflow actions trigger that can be enabled at any breakpoint (including desktop). Provide a right-aligned circular "i" info button on mobile that opens a popover with all stats; desktop shows all stats inline by default. No JS breakpoint detection; use responsive CSS classes.
- Footer configuration API: expose composable slots for primary and overflow actions/stats in layer 3. Layer 4 supplies ordered items and decides what goes in overflow. Order stays consistent across breakpoints; overflow trigger visibility is controlled by props and responsive classes.
- Footer role composition: layer 4 composes separate action sets for user vs assistant footers (may reuse ActionItem definitions), with different final layout per role.
- Footer API shape (layer 3):
  - actions: { primary: ActionItem[]; overflow?: ActionItem[]; overflowLabel?: string; showOverflowTrigger?: boolean; overflowTriggerClassName?: string }
  - stats: { primary: StatItem[]; overflow?: StatItem[]; overflowLabel?: string; showOverflowTrigger?: boolean; overflowTriggerClassName?: string }
  - overflow trigger uses a button; default label "More" for actions; info trigger uses circular "i" icon for stats. Visibility is CSS-driven (e.g., "sm:hidden") not JS.
  - ActionItem = { key, icon, label, onClick, disabled?, tooltip?, isDestructive? }
  - StatItem = { key, icon?, label }
- Layering (canonical):
  - L1 external registries (immutable): `components/ui/*`, `components/ai-elements/*`. Only compose/wrap, never edit.
  - L2 primitives (low opinion): `components/ui-custom/**/primitives/*`. No app hooks, no app types, no i18n mapping, no product copy, minimal styling.
  - L3 composed UI (opinionated): `components/ui-custom/**` (non-primitives). Receive data/actions via props. No app hooks or app state.
  - L4 app binding: `components/chat/**` or route-level. Uses hooks, maps metadata to props, selects i18n strings, builds action arrays.
  - Placement rule: if it imports app hooks or app types or derives UI from metadata, it must be L4. If it hardcodes product copy or layout conventions, it is L3. If it is a small layout/behavior piece with minimal styles, it is L2.
- Chat message file placement (within scope):
  - L3: `components/ui-custom/chat/message-action.tsx`, `components/ui-custom/chat/message-actions.tsx`, `components/ui-custom/chat/message-content.tsx`, `components/ui-custom/chat/message-footer.tsx`, `components/ui-custom/chat/message-info.tsx`, `components/ui-custom/chat/message-infos.tsx`, `components/ui-custom/chat/message-status.tsx`, `components/ui-custom/chat/thinking-block.tsx`, `components/ui-custom/chat/code-block.tsx`.
  - L4: `components/chat/chat-message.tsx`, `components/chat/chat-message-status.tsx`.
- Error UI reuse: preserve the current dynamic error message builder and translation pattern. Split error UI into a presentational status block (layer 3) that uses an L2 status layout, and a meta status adapter (layer 4) that maps metadata and actions.
- Status block composition: use a shadcn-like compound API (Root/Header/Content/Actions) built on the Alert primitive.
- Status blocks are separate: `ChatMessageErrorBlock` (i18n error mapping + retry actions) and `ChatMessageCancelledBlock` (cancelled copy + continue action). L4 chooses which to render.
- Prevent horizontal overflow: avoid new wrappers that introduce overflow-x issues; preserve existing code block behavior.
- Iterative delivery: implement in small steps in this order: (1) reasoning block + loader/header rules + duration formatter, (2) error block layering + retry binding, (3) footer overflow controls + config API, (4) layer 4 message composition cleanup, (5) demo page updates to cover all states. Each step must keep the message component usable.
- Demo page: evolve the existing component demo page to showcase all new states for the final message component; treat it as the primary manual QA surface.
- Reasoning preview window: use a simple tail slice of reasoning text (last N chars) rendered in a fixed-height container with CSS mask/fade. Preview lines count is a prop (default 2). Tail size is proportional to preview height (e.g., 240-480 chars) to keep perf stable.
- Retry binding: layer 4 supplies onRetry(message) to the error block adapter; layer 3 error block accepts onRetry?: () => void.

## Testing Decisions

- Good test: validate external behavior and visual state transitions, not internal implementation.
- No existing automated test prior art in repo; rely on manual verification using a message demo page and live chat.
- Maintain a component demo page to cover all message states and regressions.
- Manual checks: loader-only when no content, no reasoning header when no reasoning, reasoning preview while streaming, preview removed when response starts, expanded reasoning stays open, no CLS across transitions, error/cancelled renders after partial content, footer layout and overflow behavior on mobile and desktop, no horizontal overflow regressions.
- Demo states: empty (no parts), reasoning-only streaming, reasoning+text streaming, text-only (no reasoning), error with partial text, cancelled with partial text, completed with stats, completed without stats.

## Out of Scope

- Wiring real timing stats from message metadata.
- Fixing liveStatus accuracy or streaming pipeline.
- Changing main response rendering or markdown behavior.
- Altering shadcn or ai-elements registry components.
- Designing new action types beyond current copy/branch/retry set.
- Performance work beyond the reasoning preview window choice.
- Changes to the chat feed component or message list container.

## Further Notes

- Keep UI minimal by default; use subtle box only for expanded reasoning.
- Ensure no CLS by matching loader and reasoning header heights and by using fixed preview height while reasoning streams.
