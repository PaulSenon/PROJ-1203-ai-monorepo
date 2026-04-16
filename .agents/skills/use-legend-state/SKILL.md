---
name: use-legend-state
description: Apply Legend-State v3 correctly in React apps with high-performance fine-grained reactivity, especially for complex nested objects and large lists. Use when working with `@legendapp/state`, observables, `useValue`, `observer`, `Memo`, `$React`, `For`, nested object graphs, forms, derived state, or list rendering/performance refactors.
---

# Use Legend-State

Use this skill for Legend-State v3 local reactivity patterns only. No sync/persist here.

## First rules

1. Verify API semantics against official docs first:
   - `https://legendapp.com/open-source/state/v3/llms-full.md`
   - `https://legendapp.com/open-source/state/v3/llms.txt`
2. Prefer `useValue` as default React read API.
3. Treat `observer` as an optimization, not the base pattern.
4. Do not use direct `.get()` in render as the primary pattern.
5. Mutate observables directly with `.set()`, `.assign()`, `.push()`, `.delete()`.
6. Do not clone arrays/objects just to update state.
7. For arrays of objects, require stable `id`/`key` or add `${arrayName}_keyExtractor`.
8. Use `peek()` for non-tracked reads like list keys and incidental reads.

## Quick start

For new code:

1. Design store shape around stable identities and direct mutations.
2. Read state with `useValue`.
3. Use `useObservable` for component-lifetime state.
4. Use `For` for observable lists.
5. Use `Memo` or `$React` only where they reduce parent re-renders materially.
6. Batch grouped writes.

For refactors/reviews:

1. Replace render-time `.get()` reads with `useValue` where appropriate.
2. Remove immutable clone patterns.
3. Check list rows for stable ids and per-row observation.
4. Push tracking down to row/leaf components.
5. Eliminate accidental broad subscriptions in parents.

## Use case map

- React API and default patterns: [references/react-api.md](references/react-api.md)
- Complex nested objects, lists, trees, forms: [references/nested-lists.md](references/nested-lists.md)
- Performance rules and review checklist: [references/performance.md](references/performance.md)
- Migration notes and anti-patterns: [references/migration-and-antipatterns.md](references/migration-and-antipatterns.md)

## Workflow

When implementing with Legend-State:

1. Identify whether state is global (`observable`) or component-local (`useObservable`).
2. Choose smallest reactive read surface possible.
3. Keep parents shallow; let leaves observe their own fields.
4. For nested lists, preserve identity and avoid parent-wide tracking.
5. Before finalizing, run the checklist in [references/performance.md](references/performance.md).

## Output expectations

- Prefer minimal code.
- Prefer direct observable mutation over helper abstractions.
- Explain tradeoffs when choosing `observer`, `Memo`, `$React`, or `For optimized`.
- If API certainty is below high confidence, verify with docs/source before answering.
