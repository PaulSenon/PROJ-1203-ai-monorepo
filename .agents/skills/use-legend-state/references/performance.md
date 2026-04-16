# Performance Checklist

## Non-negotiables

- Use `useValue` by default.
- Push subscriptions down to leaves.
- Use `For` for object arrays.
- Give object arrays stable identity.
- Batch grouped writes.
- Use `peek()` for non-reactive reads.
- Avoid immutable clone updates.

## Writes

Good:

```ts
item$.title.set("New")
item$.assign({ title: "New", done: true })
list$.push({ id: crypto.randomUUID(), title: "x", done: false })
list$[idx].delete()
```

Bad:

```ts
const list = list$.get()
list.push(newItem)
list$.set(list)
```

## Batch multi-step updates

```ts
import { batch } from "@legendapp/state"

batch(() => {
  draft$.set("")
  store$.items.push(newItem)
  store$.count.set((n) => n + 1)
})
```

## `For optimized`

Use `optimized` only when list reorder/replace performance is a real bottleneck and node reuse is safe.

Good fit:

- large sortable rows
- swap/reorder heavy UIs

Risk:

- animation assumptions
- external DOM manipulation

## Review checklist

When auditing code:

1. Is parent subscribing to whole arrays or child fields unnecessarily?
2. Are list rows keyed by stable id without tracked parent reads?
3. Are expensive loops using raw `.get()` data when tracking is unnecessary?
4. Are there clone-and-set patterns from immutable React habits?
5. Is `observer` used only where it helps?
6. Are `$React` and `Memo` used surgically, not everywhere?

## Heuristics

- Few reads: `useValue`
- Many reads in one component: `observer` + `useValue`
- Tiny reactive leaf: `Memo`
- Reactive input/prop: `$React`
- Collection rendering: `For`
