# Streamdown Worker Highlighting - Final Takeaways and Target Implementation

## Context

Goal (MVP strict):

- code blocks render raw text instantly
- highlighting never blocks interaction (off-main-thread)
- highlighting starts only after conversation boot anchor is resolved (bottom-scroll done, conversation visible)
- solution stays minimal in Streamdown and minimal in app

Out of scope now:

- persisted rendered-html cache layer
- new Streamdown API redesign
- broad scheduler framework

## What We Tested

### 1) Upstream Streamdown contribution (POC)

- Added `deferCodeBlocks?: boolean` in Streamdown context/props.
- Reused existing `useDeferredRender` for code blocks.
- Added `startTransition` around highlighted result swap.

Observed:

- Works.
- Gives raw-first for deferred code blocks.
- But `deferCodeBlocks=true` can add visible raw-delay even when code already cached and remounting.

### 2) App-side worker offload (POC)

- Replaced direct `createCodePlugin()` usage with custom worker-backed `CodeHighlighterPlugin`.
- Worker uses `@streamdown/code` inside worker thread.
- Raw fallback stays immediate (`highlight` returns `null` on miss).

Observed:

- Big INP/perceived responsiveness gain.
- Confirms offloading compute is the key win.

### 3) POC additions that became too complex

- Markdown regex scan (`code-fence-cache.ts`) to decide `deferCodeBlocks` dynamically.
- Runtime debug globals/stats API.
- Custom newest-first queue complexity in plugin.

Observed:

- Works, but too much surface for MVP.
- Markdown pre-scan duplicates parser work and is brittle.

## Critical Feedback (external second reviewer + internal)

Reviewer (secondary) key points:

1. Keep worker protocol/worker/plugin core.
2. Drop `code-fence-cache.ts` (main-thread scan overhead, parser duplication, fragile regex).
3. Keep Streamdown upstream changes minimal (`deferCodeBlocks`, `startTransition`).
4. Remove or dev-gate debug global API.

Internal alignment:

- same conclusion: keep core offload, remove POC extras.

## Final Architecture (target)

### Streamdown side (contribution)

Keep as-is, minimal:

1. `deferCodeBlocks` prop remains optional, default `false`.
2. `startTransition` in highlighted-body remains.
3. No extra Streamdown behavior for app boot-anchor logic.

Why:

- Maintains Streamdown generality.
- App-specific boot-sequencing stays app-side.

### App side (final)

Minimal worker offload + app gate:

1. Keep worker bridge files:
   - `worker-code-highlighter-protocol.ts`
   - `worker-code-highlighter.worker.ts`
   - `worker-code-highlighter-plugin.ts`
2. Simplify plugin behavior:
   - keep sync cache hit
   - keep async callback miss
   - keep dedupe per key
   - keep fatal-error -> raw-only for session
   - remove custom queue strategy complexity (let worker serialize naturally)
3. Remove POC extras:
   - delete `code-fence-cache.ts`
   - remove debug globals/stats API
4. Add explicit app readiness gate from chat surface:
   - source of truth now: `isConversationVisible` in `conversation-layout`
   - pass down as prop through L3 chat tree to `SmoothMarkdown`
   - `SmoothMarkdown` new prop: `enableCodeHighlighting?: boolean` (default `true`)
   - when `enableCodeHighlighting=false`, pass plugins **without** `code`
   - when `true`, pass plugins **with** worker code plugin
5. App usage of `deferCodeBlocks`:
   - set `false` for chat path after gate strategy above
   - keep prop available for future non-chat screens if needed

Why this is minimal:

- no markdown pre-parsing
- no app global debug API
- no custom scheduling framework
- no app-specific logic added to Streamdown

## Implementation Details (concrete)

### A) Remove complexity

1. Delete `apps/web/src/components/ui-custom/markdown/code-fence-cache.ts`.
2. In `smooth-markdown.tsx`:
   - remove `hasUncachedCodeFence` imports and memo logic
   - remove dynamic `deferCodeBlocks` logic
3. In `worker-code-highlighter-plugin.ts`:
   - remove `window.__SDM_HL*` debug API and counters
   - remove newest-first queue bookkeeping if kept from POC
   - keep only required maps: cache + in-flight dedupe + callbacks

### B) Add boot-anchor readiness gate (app-specific)

1. Extend props chain with `enableCodeHighlighting?: boolean`:
   - `ChatConversationLayout` -> `ConversationMessagesList` -> `ConversationMessageItem` -> `ChatMessage` -> `ChatMessageAssistant` -> `MessageContentParts` -> `TextPart` / `ReasoningPart` -> `SmoothMarkdown`
2. In `ChatConversationLayout`, use current `isConversationVisible` as source.
3. In `SmoothMarkdown`:
   - build two plugin objects at module scope:
     - with code plugin
     - without code plugin
   - select based on `enableCodeHighlighting`

### C) Keep reasoning behavior as-is

- `Reasoning.Content` already returns `null` when collapsed, so expanded markdown is not mounted until open.
- no extra change needed unless regression found.

## Acceptance Criteria

1. Client nav to heavy code conversation shows raw text immediately.
2. No highlight request is scheduled before conversation becomes visible post boot-anchor.
3. Once visible, highlighting starts and progressively swaps in.
4. Main-thread responsiveness remains high during highlight operations.
5. Remount behavior does not regress due to defer pre-scan logic (since removed).
6. Code path is simpler than POC (fewer files/branches/globals).

## Risks and Mitigations

1. Worker cold-start latency on first code block.
   - Mitigation: acceptable with raw-first fallback.
2. Prop-drill for `enableCodeHighlighting` across L3 chat tree.
   - Mitigation: keep prop optional/default true; strictly L3.
3. If no-code plugin path differs visually.
   - Mitigation: use same Streamdown config minus `code` only.
4. Upstream API drift around `deferCodeBlocks`.
   - Mitigation: app no longer depends on it for core behavior.

## Final Decision Summary

- Keep: worker offload core + upstream minimal changes.
- Remove: cache scan, debug globals, queue feature-creep.
- Gate highlight start using app `isConversationVisible` by not passing `code` plugin until ready.
- Treat `deferCodeBlocks` as optional helper, not core dependency.

## Unresolved Questions

- none
