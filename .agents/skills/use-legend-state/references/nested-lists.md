# Nested Objects And Lists

## Core rules

- Prefer stable ids everywhere in nested collections.
- Observe as deep as possible; avoid parent reads of child fields.
- Keep rows/items as observables, not raw cloned values.
- For huge non-reactive computations over large nested data, call `.get()` first to escape proxy churn.

## List rendering default

Use `For` for observable arrays of objects.

```tsx
import { For, useValue } from "@legendapp/state/react"

function Row({ item$ }: { item$: any }) {
  const text = useValue(item$.text)
  const done = useValue(item$.done)
  return <div>{done ? "x" : "o"} {text}</div>
}

function List() {
  return <For each={store$.items} item={Row} />
}
```

## Nested object graph pattern

```tsx
const board$ = observable({
  sections: [{
    id: "s1",
    title: "Inbox",
    cards: [{ id: "c1", title: "First", selected: false }],
  }],
})
```

- Parent renders sections.
- Section component renders cards.
- Card component observes its own fields.
- Selection toggles should update only the touched card/derived selectors.

## Key extraction

If item id is not `id` or `key`, add a key extractor next to the array.

```ts
const store$ = observable({
  rows: [] as { meta: { uuid: string }; label: string }[],
  rows_keyExtractor: (row) => row.meta.uuid,
})
```

## Manual mapping

If not using `For`, never `get()` child fields in the parent mapper.

Bad:

```tsx
return store$.items.map((item) => <Row key={item.id.get()} item$={item} />)
```

Good:

```tsx
return store$.items.map((item) => <Row key={item.peek().id} item$={item} />)
```

## Forms with nested state

- Bind directly to leaf fields.
- Avoid lifting every input value into React state.
- Use local `useObservable` form state when draft lifetime is component-scoped.

```tsx
<$React.input $value={form$.profile.name} />
<$React.textarea $value={form$.details.notes} />
```

## Derived selections and linked nodes

Good fit:

- selected item by id/index
- aggregate checkbox / select-all
- filtered derived collections

Prefer computed functions when reuse matters. Prefer inline `useValue(() => ...)` when local to one component.

## Large read-only passes

For summaries over large nested lists, use raw data if no tracking needed.

```ts
const sections = board$.sections.get()
const total = sections.reduce((sum, section) => sum + section.cards.length, 0)
```

Do not loop through observable children with repeated `.get()` unless you actually need reactive tracking at each node.
