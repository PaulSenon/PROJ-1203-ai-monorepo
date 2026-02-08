# PRD: Status Block (L2) + Message Status Adapter (L3)

## Problem Statement

Users see inconsistent, low-clarity error/cancelled callouts in chat messages. Developers lack a reusable, layer-correct status block with a stable API, and a typed mapping from app error metadata to UI copy + actions.

## Solution

Deliver a reusable L2 `StatusBlock.*` compound component and a L3 message status adapter that maps `ChatErrorMetadata` + cancel state into consistent UI copy and action descriptors. Keep actions as external components (mocked for now) so future action-list work can swap implementations without changing message layout.

## User Stories

1. As a user, I want a cancelled callout in the message flow, so I know the assistant was stopped.
2. As a user, I want error callouts with clear titles and details, so I understand what happened.
3. As a user, I want recovery actions shown with the callout, so I can retry quickly.
4. As a user, I want the callout visually subtle, so it does not overpower content.
5. As a user, I want consistent error wording across messages, so I trust the UI.
6. As a user, I want unknown errors to look consistent, so I’m not confused by new failures.
7. As a user, I want token-limit errors to explain the limit, so I can pick a better model.
8. As a user, I want suggested-model retries when available, so recovery is faster.
9. As a user, I want retry actions still available when suggestions are missing, so I’m not blocked.
10. As a user, I want the callout to appear after the response text, so context is preserved.
11. As an accessibility user, I want status changes announced appropriately, so I don’t miss failures.
12. As a developer, I want the status block reusable outside chat, so design stays consistent.
13. As a developer, I want strict L2/L3 boundaries, so app logic does not leak into design system.
14. As a developer, I want a typed mapping from error kinds to UI, so new kinds are forced to be handled.
15. As a developer, I want error→action props mapping, so action components get typed props.
16. As a developer, I want action components injected, so status UI does not own app behavior.
17. As a developer, I want action components replaceable without layout changes, so follow-up PRDs stay isolated.
18. As a developer, I want graceful fallbacks for missing model data, so UI never breaks.
19. As a developer, I want the status block to support multiple variants, so future states can reuse it.

## Implementation Decisions

- **Layering**: L2 is app-agnostic and exports `StatusBlock.*` as a namespace compound. L3 (message feature) adapts app status to L2 and injects actions. L2 may import L1 types; L2 must not import app types.
- **L2 API (final)**:
  - `StatusBlock.Root`: container, accepts `kind` (`info|warning|error|debug`) and `className`.
  - `StatusBlock.Icon`: icon slot.
  - `StatusBlock.Content`: text wrapper containing Title + Body; sets live-region semantics based on `kind`.
  - `StatusBlock.Title`: title slot.
  - `StatusBlock.Body`: description slot (supports multiple lines).
  - `StatusBlock.Actions`: actions container slot (renders any children).
- **Accessibility** (MDN guidance):
  - Live region applied to `StatusBlock.Content`, not the root.
  - `kind=error` uses `role="alert"` on Content (assertive). Other kinds use `role="status"` (polite).
  - Actions are outside the live region to avoid interactive elements inside `role="alert"`.
- **Visual baseline**: compact callout with subtle border + muted background; icon + text in a row; actions aligned below or inline depending on width. No heavy panels.
- **L3 Message Status Adapter**:
  - Input: message live status + `ChatErrorMetadata` (from app message metadata).
  - Output: derived status data with `kind`, `title`, `descriptionLines`, and `actions` descriptors.
  - Precedence: cancelled over error; render after content and before footer.
  - `ChatErrorMetadata.message` is not rendered in UI (reserved for logs) to avoid leaking raw errors.
- **L3 file split** (message feature):
  - `_parts/status.tsx` orchestrates selection + renders one of the two below.
  - `_parts/status-cancelled.tsx` renders static cancelled UI (text + action slots).
  - `_parts/status-error.tsx` renders procedural error UI (mapping + actions).
- **Error copy mapping** (typed, exhaustive):
  - `AI_API_ERROR`: title “AI Provider Error”; body: “Please retry with another model.”
  - `UNKNOWN_ERROR`: title “Unknown Error”; body: “Sorry for the inconvenience.”
  - `MAX_OUTPUT_TOKENS_EXCEEDED`: title “Max output tokens exceeded”; body includes optional max token limit and suggested model ids when present.
  - Local i18n map exists in L3 with default `en`; no global i18n integration yet.
- **Action descriptors** (external components):
  - L3 produces a typed list of action descriptors; each descriptor has `id`, `label`, `intent`, and `payload`.
  - L3 uses `actionComponentMap` keyed by error kind and full error data to map error → component + props.
  - Each action component receives derived props from error metadata (example: `{ label, modelId }`).
  - For now, placeholder components render simple buttons and log derived props on click.
- **Action mapping per kind** (final behavior with graceful fallback):
  - Cancelled: “Continue”, “Retry with another model”.
  - AI_API_ERROR: “Retry”, “Retry with another model”.
  - UNKNOWN_ERROR: “Retry”, “Retry with another model”.
  - MAX_OUTPUT_TOKENS_EXCEEDED: “Retry with suggested model” (if provided), “Retry with different model” filtered by model capability (if model catalog provided); otherwise fall back to “Retry”.
  - If model catalog or suggested ids are unavailable, do not block rendering; degrade to generic retry action.
  - If error kind is unrecognized, treat as UNKNOWN_ERROR.
- **Typesafety**: L3 error mapping must be exhaustive over `ChatErrorMetadata["kind"]` using discriminated-union utilities (pattern from `chat-message-error.tsx`).

## Modules and Interfaces

Deep modules (stable interface, heavy logic):

- Error-to-UI mapping module in L3: function that maps `ChatErrorMetadata` + optional model info to `{ title, descriptionLines, actions }`.
- Action-props mapper in L3: function that maps error kind + error params to action component props.

Shallow modules (composition only):

- L2 `StatusBlock.*` compound file.
- L3 message status orchestrator + cancelled/error subparts that render L2 using derived data.

## Testing Decisions

- Ask a review sub-agent to review your changes against the prd and task picked.
- Ask a review sub-agent performance reviewer to review your changes based on react skills and best practices to make sure we are following the best practices in terms of performance and reactivity in react19.
- Ask a review sub-agent accessibility reviewer to review your changes based on accessibility best practices to make sure we are following the best practices in terms of accessibility.
- Test external behavior only (rendered text, action availability, fallback behavior, accessibility roles).
- Manual QA via message demo page: cancelled/error states, copy lines, actions, spacing, and focus order.
- Accessibility check: live region roles on Content; actions outside Content.
- No automated tests until a framework exists in apps/web.

## Out of Scope

- Action list L2 component and advanced menus (separate PRD).
- Real retry/model-picker logic and data fetching.
- Global i18n hooks or localization framework. (only basic i18n inside errorstatus L3 component)
- Styling polish beyond the baseline callout.

## Further Notes

- Core message PRD: `.llms/proj/chat-message-ui-refactoring/5-prd-message-ui.md` (status placeholder section should include `StatusBlock.Content`).
- Requirements: `.llms/proj/chat-message-ui-refactoring/1-ui-requirements.md`.
- Example mapping pattern (reference only): `.llms/proj/chat-message-ui-refactoring/7-error-maping-type-legacy-saved.tsx`.
- Error metadata schema: `packages/backend/convex/schema.ts` (ChatErrorMetadata).
- ARIA guidance: MDN `alert` and `status` roles.

