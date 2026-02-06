# PRD: Reasoning Block Rework (Architecture First)

## Problem Statement

Core message UI refactor is done, but reasoning implementation drifted from the intended 3-layer model.

Current issues:

- L2 reasoning is too thin and does not own enough compound behavior.
- L3 reasoning part owns too many UI states (`open`, preview/content branching), reducing readability and maintainability.
- Empty reasoning behavior is under-specified and inconsistent.
- Existing implementation does not clearly align with L1 `ai-elements/reasoning` patterns.

This blocks final reasoning polish and risks repeated architecture mistakes in follow-up work.

## Solution

Rework reasoning with architecture as first priority, then finalize behavior details.

- First task is a no-visible-change internal reshape of L2/L3 responsibilities.
- L2 `Reasoning.*` becomes the behavior owner for reasoning UI state.
- L3 `reasoning-part` becomes a thin app adapter (part mapping + composition only).
- L2 must extend or directly reuse L1 `ai-elements/reasoning` behavior for overlapping concerns, and explicitly document intentional deltas.
- Add explicit empty-reasoning spec: trigger disabled (and chevron hidden).
- Final preview implementation is CSS-only using fixed viewport height + bottom-anchored content with matching `min-height`.
- Top fade in preview must use a simple overlay gradient, not `mask-image`.

## User Stories

1. As a user, I want reasoning behavior to feel stable, so expand/collapse does not feel random.
2. As a user, I want collapsed reasoning preview while streaming, so I can scan progress fast.
3. As a user, I want preview hidden once reasoning ends, so the response flow stays clean.
4. As a user, I want to expand reasoning and read full content, so I can inspect details.
5. As a user, I want empty reasoning blocks to stay non-interactive, so I do not click dead controls.
6. As a user, I want chevron behavior to be visually coherent for empty reasoning, so the header feels intentional.
7. As a keyboard user, I want reasoning toggle to be accessible, so interaction is reliable.
8. As a screen-reader user, I want no duplicate content announcements, so reading order is clear.
9. As a developer, I want L2 to own compound state, so L3 stays simple.
10. As a developer, I want L2 aligned with L1 reasoning model, so future updates are safer.
11. As a developer, I want explicit state rules (truth table), so implementation has zero ambiguity.
12. As a developer, I want architecture-first tasking, so we fix foundations before visuals.
13. As a user, I want the first streamed preview line to appear at the top of the preview viewport, so initial reading starts naturally.
14. As a user, I want next streamed lines to flow downward normally until viewport is full, so scanning feels like standard text.
15. As a user, I want overflowed preview to keep the latest line visible at the bottom, so I always see current reasoning progress.
16. As a user, I want older overflowed preview content clipped at the top with a subtle fade, so hidden content is implied without noise.
17. As a developer, I want preview visible-line count controlled by prop, so message variants can tune density without rewriting styles.

## Implementation Decisions

### Non-Negotiable Constraints

- Follow `apps/web/src/components/README.md` layer rules strictly.
- Do not edit L1 files.
- Do not change message layout composition (work only in reasoning message part (L3) and reasoning primitives (L2))
- Keep reasoning artifact path canonical as `apps/web/src/components/chat/message/_parts/reasoning-part.tsx`.

### L1/L2/L3 Ownership Contract

L1 (immutable base):

- `apps/web/src/components/ai-elements/reasoning.tsx`
- Source of baseline reasoning behavior patterns (context, trigger/content semantics, toggle lifecycle).

L2 (design system, app-agnostic):

- `apps/web/src/components/ui-custom/chat/reasoning.tsx`
- Owns reasoning compound interaction rules and visual contracts.
- Owns open/collapse behavior internally.
- Owns empty-state interactivity policy (disabled trigger behavior).
- Owns preview/content visibility rules from compound state.

L3 (feature adapter, app-aware):

- `apps/web/src/components/chat/message/_parts/reasoning-part.tsx`
- Maps `MyUIMessagePart` to L2 props and slots.
- Computes app-derived values only (`isStreaming`, `text`).
- Must not own local open/collapse state machine.

### L1 Alignment Requirements (Mandatory)

L2 must reuse or mirror L1 behavior for overlapping concerns:

- Reasoning root/trigger/content composition semantics must stay compatible with L1 mental model.
- Trigger remains a real button and preserves collapsible accessibility semantics.
- Toggle/open lifecycle must be handled in L2 (not L3).

Allowed intentional deltas (must remain explicit in code comments and PR notes):

- Product requires collapsed-by-default reasoning flow in chat; do not reintroduce uncontrolled L3 `open` state.
- L2 adds `Preview` (not present in L1).
- L2 owns fixed empty-state chevron behavior (hidden chevron + reserved width).

### L2 Public API Contract (Final)

Expose namespace object only:

- `Reasoning.Root`
- `Reasoning.Trigger`
- `Reasoning.Preview`
- `Reasoning.Content`

`Reasoning.Root`:

- Explicit props only: `isStreaming`, `className`, `children` `disabled`.
- Do not expose raw `Collapsible` control props in L2 public API.
- Internal state: open/collapsed (private to L2) ctx (`isOpen` when !disabled && open).
- Forbidden public control props: `open`, `defaultOpen`, `onOpenChange`.

`Reasoning.Trigger`:

- Always renders a button.
- Trigger visual structure is owned by L2 (icon + label area + chevron).
- Public API is minimal: `label`, `className`, `disabled`.
- Disabled when `disabled === true` (from root ctx).
- Empty-state chevron rule is internal (not configurable in this PRD): hide chevron when disabled and keep its footprint reserved.
- Chevron is always excluded from accessibility tree.
- No arbitrary `children` override in this PRD (prevents policy bypass).

`Reasoning.Preview`:

- Inputs: `lines` (default `2`), `children`.
- `lines` contract: integer `>= 1`; non-integer values are floored; invalid values fallback to `2`.
- `lines` is treated as stable during an active streaming session for a given reasoning block.
- Renders only when `!disabled && isStreaming && !isOpen`.
- Must be `aria-hidden`.
- CSS-only clipping, no JS fallback, no DOM measurement.
- Height is deterministic from one fixed design-system line-height token (rem ?) × `lines` (stable size, no layout shift).

CSS structure contract (mandatory):

- Preview viewport: fixed height (`line-height-token * lines`), `position: relative`, `overflow: hidden`.
- Preview content wrapper: `position: absolute`, `left: 0`, `right: 0`, `bottom: 0`, `min-height` equal to preview viewport height.
- Text flow stays normal inside content wrapper (`whitespace-pre-wrap`).
- Top fade uses overlay gradient pseudo-element or sibling overlay (simple `linear-gradient` to transparent), with `pointer-events: none`.

### Final Preview UX Spec (Authoritative)

Preview viewport behavior is mandatory and must match this sequence:

1. Phase A (underflow): first visual line appears at the top edge of preview viewport.
2. Phase A (underflow): next visual lines flow below normally until viewport reaches configured `lines` height.
3. Phase B (overflow): once content exceeds viewport height, viewport behaves as bottom-following window.
4. Phase B (overflow): latest currently streaming visual line remains visible at bottom edge.
5. Phase B (overflow): older content overflows upward, is clipped at top, with subtle top fade to indicate hidden history.

Visual constraints:

- Preview viewport height remains constant during all streaming phases.
- No border-heavy container in collapsed preview (minimal visual weight).
- Fade must be subtle and non-blocking (`pointer-events: none`).
- Fade appear at top only once it overflow. (overflow detection can be approximated, we need something simple.)

### Overflow Fade Trigger Strategy (Decision Locked)

Decision:

- **Selected: Option D - IntersectionObserver sentinel, one-way latch.**

Why this decision:

- Product wants better overflow truth than heuristic-only while keeping runtime cheap.
- Product accepts stale behavior on later window/layout resize.
- Repo already has reusable IntersectionObserver hooks/patterns, reducing implementation risk.

Target behavior (authoritative):

- Fade starts hidden (`showTopFade=false`) for each newly mounted reasoning block.
- While preview is rendered (`!disabled && isStreaming && !isOpen`), observe a top-edge sentinel inside preview content with preview viewport as IO root.
- Once sentinel is no longer intersecting root (overflow reached), latch fade on.
- **Latch is one-way per reasoning block lifecycle**: once on, never auto-off until block unmount/remount.
- After latch turns on, observer disconnects/unsubscribes (no ongoing observer cost).

Implementation constraints:

- Reuse existing observer infra; do not add new ad-hoc observer utilities in this PRD.
- Keep current CSS preview structure contract unchanged (fixed viewport + absolute bottom content wrapper + min-height match).
- No polling loops, no per-token layout reads, no forced-sync measurement flow.
- If `IntersectionObserver` is unavailable, keep current heuristic-only fallback for fade trigger.

Rejected alternatives (explicit):

- **Option A - Heuristic-only**: rejected as primary due to known false positive/negative drift.
- **Option B - One-way ResizeObserver latch**: rejected for this PRD because repo already has IO abstraction but no RO abstraction; IO path is simpler here.
- **Option C - Continuous ResizeObserver**: rejected due to unnecessary callback churn for streaming-heavy chat.

`Reasoning.Content`:

- Inputs: `children`.
- Renders only when `isOpen` (from root ctx).
- Uses collapsible content semantics.

### Rendering Truth Table (Authoritative)

Inputs:

- `disabled` (trimmed reasoning text === 0)
- `isStreaming` (part state)

Internals ctx:

- `isOpen` (L2 internal derived from internal trigger open state and disabled prop)
- `disabled`

Outputs:

- `disabled`: render header row only; trigger disabled; preview hidden; content hidden.
- `!disabled && isStreaming && !isOpen`: header + collapsed preview.
- `!disabled && !isStreaming && !isOpen`: header only (no preview).
- `!disabled && isOpen`: header + expanded content.

State transitions (authoritative):

- Initial mount of each reasoning block: `isOpen = false`.
- Streaming start/end never force open/close.
- User toggle is authoritative after mount.
- `disabled: true -> false`: keep `isOpen` unchanged (fresh block remains closed by default).
- `disabled: false -> true`: force `isOpen = false`, trigger disabled.

Chevron behavior for empty state:

- If trigger is disabled (`disabled`), chevron is hidden.
- Chevron width stays reserved with an invisible placeholder to avoid layout shift.

### Markdown and Performance Contract

- Make sure L3 -> L2 is performant. NB: the text prop extracted from reasoning part will have intensive update rate while streaming, other props will likely update way less often.
- Preview and expanded content must never mount two markdown renderers at once.
- Renderer choice stays in L3 (`SmoothMarkdown`), visibility gating stays in L2 (`Preview` vs `Content`).
- Keep preview clipping CSS-first (fixed line-height math + overflow clipping + gradient overlay).
- Use baseline CSS features; avoid advanced/non-baseline-only techniques for critical behavior.
- Do not use `mask-image`; use simple overlay gradient for fade.
- Do not use text slicing, line counting in JS, per-token layout measurement, or measurement loops.
- Clarification: bounded observer approach is selected in this PRD (IntersectionObserver one-way latch only); polling or forced-sync measurement loops remain forbidden.
- Keep overflow guards for code blocks/tables in expanded content.

### Accessibility Contract

- Trigger remains keyboard operable in non-disabled states.
- Disabled state uses real `disabled` semantics.
- `aria-expanded` state must match actual open state.
- Preview is hidden from assistive tech (`aria-hidden=true`).
- Preview is strictly non-interactive (`pointer-events: none`) and must not expose tabbable descendants while collapsed.
- Focus ring and contrast remain aligned with design-system conventions.

## Testing Decisions

- Behavior tests must validate external behavior only, never internal implementation details.
- Architecture review pass required after each task to ensure L2/L3 boundaries remain clean.
- Performance review pass required for streaming updates and markdown mount policy.
- Accessibility review pass required for trigger semantics and hidden preview behavior.

Manual QA matrix (required):

User will conduct manual QA against the demo message component that should be able to simulate all message component states (apps/web/src/routes/components/\_components/messages.tsx)

- Streaming + collapsed (underflow): first line starts at top, next lines flow downward.
- Streaming + collapsed (overflow): latest line stays pinned to bottom, older lines clip/fade at top.
- Streaming + collapsed (overflow transition): fade appears once true overflow happens, not before.
- Streaming + collapsed (after latch): fade stays visible for that block lifecycle; no flicker on further chunk appends.
- Done + collapsed: preview gone, header still present.
- Expanded: full reasoning content visible.
- Empty reasoning: trigger disabled, preview/content absent, chevron policy respected.
- Keyboard: toggle works when enabled, no interaction when disabled.
- Screen reader: no duplicate preview/content narration.

## Out of Scope

- Message-level state machine redesign (A/B/C/D from core PRD).
- Footer/status redesign.
- New backend fields or protocol changes.
- Fancy animation systems beyond current expand/collapse needs.

## Further Notes

Primary references:

- `.llms/proj/chat-message-ui-refactoring/5-prd-message-ui.md`
- `.llms/proj/chat-message-ui-refactoring/1-ui-requirements.md`
- `apps/web/src/components/README.md`
- `apps/web/src/components/ai-elements/reasoning.tsx`
- `apps/web/src/hooks/utils/use-intersection-observer.tsx`
- `apps/web/src/hooks/utils/use-scroll-edges.tsx`

Rejected alternative (documented, not selected):

- CSS-only always-bottom preview (without `min-height` matching viewport): simpler but violates underflow "first line at top" requirement.

Target artifacts:

- `apps/web/src/components/ui-custom/chat/reasoning.tsx` (L2)
- `apps/web/src/components/chat/message/_parts/reasoning-part.tsx` (L3)
- `apps/web/src/routes/components/_components/messages.tsx` (QA surface)

## Task List

### T1 - Architecture reshape only (no user-visible change)

Goal: fix ownership and composability first.

Implementation details:

- Move open/collapse state machine ownership from L3 to L2 root context.
- Remove local `isOpen` and preview/content boolean state machine from L3.
- Keep current visual output and copy unchanged.
- Keep current rendering order and message composition unchanged.
- Do not change streaming transition behavior in T1.
- Do not introduce duration-label changes in T1.

Acceptance criteria:

- L3 no longer manages open state.
- L2 controls open state internally.
- No intentional UX or visual diff.

### T2 - L1-aligned L2 contract hardening

Goal: make L2 behaviorful and aligned with L1 model.

Implementation details:

- Ensure root/trigger/content semantics are built from or clearly mirrored to L1 behavior.
- Keep toggle/open lifecycle logic in L2.
- Finalize L2 API removing controlled open props from public surface.

Acceptance criteria:

- L2 API matches this PRD contract exactly.
- L3 only passes app-derived inputs, no control-state plumbing.

### T3 - Empty reasoning + chevron policy

Goal: finalize empty-state behavior explicitly.

Implementation details:

- Empty text keeps header row.
- Trigger disabled when empty.
- Hide chevron internally when disabled while preserving chevron width.
- Ensure preview/content do not render when empty.

Acceptance criteria:

- Empty state is non-interactive and visually stable.
- Chevron is hidden in empty state and header layout stays stable.

### T4 - Preview/content final behavior + performance

Goal: lock final UX and streaming performance.

Implementation details:

- Apply truth table rules exactly.
- Enforce single markdown renderer mounted at a time.
- Implement final preview 2-phase UX (underflow top-flow, overflow bottom-follow) with stable viewport height.
- Implement preview with mandatory CSS structure contract (`relative` + fixed-height viewport + `overflow: hidden`; absolute bottom content wrapper with matching `min-height`).
- Keep CSS-first clipping/fade behavior and overflow guards.

Acceptance criteria:

- No preview after reasoning is done while collapsed.
- Streaming updates remain smooth without measurement jank.
- Preview behavior matches the 5-step authoritative UX spec exactly.

### T5 - Demo and verification lock

Goal: ensure feature can be validated in isolation.

Implementation details:

- Update demo scenarios for all reasoning states (empty, streaming, done, expanded).
- Validate manual QA matrix end-to-end.
- Run architecture, performance, and accessibility review passes.

Acceptance criteria:

- Demo covers all states in this PRD.
- Review passes confirm no layer drift.

### T6 - Overflow fade trigger rework (IO one-way latch)

Goal: replace heuristic-primary fade trigger with IO sentinel latch while keeping preview contract intact.

Implementation details:

- Scope: L2 only in `apps/web/src/components/ui-custom/chat/reasoning.tsx`; L3 should remain adapter-only.
- Add internal preview-latch state in `Reasoning.Preview` (default false, per block lifecycle).
- Add preview viewport root ref and sentinel target ref using existing IO hooks.
- Use existing hook from `apps/web/src/hooks/utils/use-intersection-observer.tsx` (or existing sentinel pattern from `apps/web/src/hooks/utils/use-scroll-edges.tsx`) instead of ad-hoc observer code.
- Observer active only when preview is rendered and latch is false.
- On first `not intersecting` event, set latch true and stop observing.
- Keep heuristic as fallback only when IO API unavailable.
- Keep top fade element decorative only (`aria-hidden`, `pointer-events-none`).
- Do not alter preview sizing math, content wrapper placement, or markdown rendering policy.

Acceptance criteria:

- Fade is hidden before overflow and appears once overflow is real.
- Fade latches once and does not flicker during continued streaming.
- Observer no longer runs after latch (or when preview not rendered).
- No L3 open-state logic or observer logic added.
- Existing underflow/overflow UX sequence remains compliant.

## Definition of Done

- T1-T6 all complete.
- L2 owns reasoning interactive state.
- L3 reasoning part is adapter-only and readable.
- Empty reasoning uses disabled trigger and hidden chevron with reserved width.
- Reasoning behavior follows authoritative truth table.
- PRD can be implemented standalone without additional context.
