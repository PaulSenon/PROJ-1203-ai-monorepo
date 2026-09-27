# PRD - Downstream Message Render Performance Hardening (Phase 2)

## Problem Statement

After stabilizing message identity in `useMessages`, the next performance bottlenecks live downstream in the message consumption and rendering pipeline.

The current conversation UI still has several sources of avoidable work:

- the last rendered assistant row can flip between streaming and static markdown modes;
- static messages still go through smoothing-oriented markdown code paths meant for actively streaming content;
- collapsed reasoning blocks still pay more work than necessary;
- some conversation-shell subscriptions remain broader than ideal;
- virtualization is configured well enough to work, but still depends heavily on row-level prop stability to avoid visible-item rerenders.

The user-facing risk is not just “too many React renders” in the abstract. The real risks are:

- markdown reparsing or reanimation of rows that should already be settled;
- unnecessary rerenders of visible virtualized items;
- extra layout churn on the tail assistant row;
- degraded smoothness during streaming in long conversations;
- more downstream work than necessary even after upstream message identity is fixed.

This phase focuses on tightening the downstream rendering path without rewriting the chat architecture.

## Solution

Harden the downstream render pipeline so only the actively changing visible tail does meaningful work during streaming, while settled rows remain cheap and stable.

The solution has five parts:

1. Make last-message markdown mode one-way: once a message is consolidated/static, it never flips back to streaming mode.
2. Split markdown rendering into explicit static and streaming paths so settled messages skip smoothing-oriented work.
3. Keep reasoning-heavy content unmounted until expanded, and make collapsed reasoning preview intentionally lightweight.
4. Reduce downstream prop churn and keep layout-only concerns outside `ChatMessage` when possible.
5. Document, but do not immediately adopt, a possible later hybrid external-store architecture for per-message subscriptions if prop-based optimization proves insufficient.

## User Stories

1. As a chat user, I want completed assistant messages to stop behaving like streaming content, so the transcript feels settled and calm.
2. As a chat user, I want only the actively streaming tail to animate or smooth, so older content feels stable.
3. As a chat user, I want markdown-heavy past messages to remain responsive while new tokens arrive, so long threads stay smooth.
4. As a chat user, I want code blocks, math, links, and mermaid content in completed messages to remain visually identical while becoming cheaper to render.
5. As a chat user, I want the last assistant row to reserve space without repeatedly invalidating the message rendering subtree, so streaming feels stable.
6. As a chat user, I want reasoning sections to remain lightweight while collapsed, so hidden content does not slow down the page.
7. As a chat user, I want expanded reasoning content to appear only when I open it, so I do not pay rendering cost for content I am not reading.
8. As a chat user, I want collapsed reasoning previews to stay readable without requiring the full reasoning block to remain hot, so the interface stays fast.
9. As a chat user, I want large conversations with active streaming to scroll smoothly, so virtualization continues to feel invisible.
10. As a developer, I want markdown rendering paths to clearly separate `streaming` from `static`, so performance intent is obvious in code.
11. As a developer, I want the last-message consolidate rule to be explicit and one-way, so rendering mode cannot oscillate accidentally.
12. As a developer, I want layout-only row concerns to stay outside the message component, so message memoization is easier to preserve.
13. As a developer, I want reasoning preview cost to scale sublinearly with very large reasoning blocks, so hidden content does not become a silent bottleneck.
14. As a developer, I want to keep the existing prop-based data flow for now, so optimization does not prematurely complicate architecture.
15. As a maintainer, I want any later external-store option to be documented with clear tradeoffs, so it can be evaluated intentionally instead of reactively.
16. As a maintainer, I want this phase to stay tightly scoped to downstream consumption of message state, so risk stays controlled.
17. As a maintainer, I want visible-item rerender minimization to work with LegendList rather than fighting it, so virtualization remains predictable.
18. As a maintainer, I want expensive downstream work to happen only when it changes visible output, so performance optimizations remain explainable.

## 'Polishing' Requirements

1. Settled messages should visually behave the same as today while becoming cheaper to rerender.
2. Only the active streaming tail should remain meaningfully dynamic in the normal happy path.
3. Markdown behavior parity must be preserved for static and streaming content.
4. Reasoning collapsed state should feel lighter without degrading readability.
5. Any one-way latch behavior must be obvious and not hidden behind clever implicit logic.
6. New optimizations must reduce work without making the render path harder to understand.
7. Virtualization behavior must remain deterministic during append and stream growth.
8. No broad architectural rewrite should be smuggled into this phase.

## Implementation Decisions

1. **One-way consolidate latch**
   - The conversation list owns the rule that streaming markdown applies only to the active dynamic tail.
   - Once a message is considered consolidated/static, that message remains consolidated for the lifetime of the mounted list scope.
   - This prevents markdown mode oscillation and downstream reparsing/remount churn.

2. **Tail reserve-space stays outside `ChatMessage`**
   - Height reservation for the last dynamic assistant row is handled by the row wrapper, not by the message component props.
   - The virtualizer still measures the outer row box.
   - This keeps layout-only state from invalidating message-component memo boundaries.

3. **Explicit static vs streaming markdown paths**
   - Markdown rendering is split into two explicit paths:
     - streaming path: smoothing-enabled, animation-aware;
     - static path: no smoothing hook, static mode only.
   - Shared Streamdown configuration is hoisted where stable.
   - Per-domain link-safety behavior stays functionally unchanged.

4. **Static markdown skips smoothing work**
   - Completed messages should not run smoothing-oriented hooks intended for token-by-token streaming.
   - Static content passes raw text directly into the markdown renderer.

5. **Stable markdown config objects**
   - Animated config, controls config, remend config, and other static option objects should be hoisted or memoized to avoid avoidable prop churn into Streamdown.
   - Only values truly dependent on current runtime inputs should remain dynamic.

6. **Reasoning expanded content remains unmounted while closed**
   - Full reasoning markdown should not stay mounted when the reasoning block is collapsed.
   - Deferred or expensive reasoning text processing should move inside the open-content subtree.

7. **Collapsed reasoning preview becomes intentionally lightweight**
   - Collapsed preview should avoid always rendering the full hidden reasoning text.
   - For large reasoning payloads, preview may use a bounded text slice and a simplified overflow strategy.
   - Exact preview content may be approximate as long as the UI intent remains preserved.

8. **LegendList integration remains prop-first**
   - This phase assumes row identity stability still comes primarily from stable message props and list item identity.
   - `itemsAreEqual` may be used as a later reinforcement mechanism, but is not the primary source of correctness in this phase.
   - `getItemType` should continue to be used.

9. **External-store option is documented, not adopted by default**
   - A later hybrid store architecture remains an option:
     - list receives ordered ids;
     - visible row subscribes to `messageById`.
   - This can reduce visible-item rerenders further, but introduces less explicit data flow and higher architectural complexity.
   - It is not required for this phase unless simpler prop-based work proves insufficient.

10. **Context granularity remains evolutionary**
    - Existing context split is valid.
    - If needed later, messages may be split further from colder pagination/meta fields.
    - This phase does not require replacing current context architecture.

11. **Failure-mode rule**
    - If a downstream optimization is uncertain, correctness and readability win.
    - Settled behavior should remain deterministic even if some micro-optimization is skipped.

## Testing Decisions

1. **Test quality bar**
   - Test external behavior and rendering-mode invariants, not internal helper structure.
   - Prefer tests that validate when an expensive path activates over tests that assert exact implementation details.

2. **Markdown path tests**
   - Verify settled/static messages use static markdown mode and do not regress visible output.
   - Verify active streaming messages still use streaming behavior and continue to animate/smooth as intended.
   - Verify code highlighting, math, mermaid, and link-safety behavior remain functionally unchanged.

3. **Consolidate latch tests**
   - Verify a message can transition from active/streaming to static/consolidated.
   - Verify it does not transition back to streaming mode afterward within the mounted scope.
   - Verify non-tail settled rows remain consolidated.

4. **Reasoning behavior tests**
   - Verify expanded reasoning content is not mounted while collapsed.
   - Verify collapsed preview still appears for streaming reasoning when appropriate.
   - Verify large collapsed reasoning blocks avoid unnecessary full hidden-content work.

5. **Virtualized conversation tests**
   - Validate that visible-item updates stay limited to the intended tail in common append/stream scenarios.
   - Validate no visual regressions in tail reserve-space behavior.
   - Validate scrolling behavior remains stable during streaming growth.

6. **Manual QA focus**
   - Stream long assistant replies with markdown-heavy content.
   - Expand/collapse reasoning repeatedly during streaming and after completion.
   - Observe whether older rows remain visually stable while the last assistant row updates.
   - Validate code blocks, mermaid, and math still render correctly in both active and settled messages.

7. **Automated checks in scope**
   - Run `pnpm run check-types` after implementation.

## Out of Scope

1. Full external-store migration for chat messages.
2. Replacing the current context architecture wholesale.
3. Rewriting Streamdown or markdown provider internals.
4. Broad message data-model changes.
5. Upstream `useMessages` stabilization work already covered by the previous PRD.
6. New UI features or changes to product behavior unrelated to render performance.
7. Broader virtualization redesign beyond downstream row-consumption improvements.

## Further Notes

1. This phase assumes the upstream `useMessages` stabilization work either lands first or remains the foundation for these downstream wins.
2. The biggest downstream payoff is expected from separating static markdown from streaming markdown.
3. A hybrid external-store approach remains technically viable with LegendList because mounted visible rows can subscribe and rerender independently, but it should only be used if simpler prop-based approaches are insufficient.
4. The target outcome is not zero rerenders; it is to ensure only rerenders with real visible impact still pay meaningful cost.
5. This PRD intentionally keeps architecture conservative and incremental.

## Unresolved Questions

- None currently.
