# React API

## Default choices

- Global/shared state: `observable(...)`
- Component-lifetime state: `useObservable(...)`
- Read one/few values in React: `useValue(...)`
- Read many values in one hot component: `observer(...)` + `useValue(...)`
- Tiny self-updating leaf: `Memo`
- Reactive DOM props / two-way bind: `$React`
- Side effects from observables: `useObserve` or `useObserveEffect`

## Canonical pattern

```tsx
import { observable } from "@legendapp/state"
import { useObservable, useValue } from "@legendapp/state/react"

const store$ = observable({
  filter: "all" as "all" | "open" | "done",
  items: [] as { id: string; text: string; done: boolean }[],
})

export function TodoPanel() {
  const draft$ = useObservable("")
  const filter = useValue(store$.filter)
  const draft = useValue(draft$)

  return (
    <section>
      <input value={draft} onChange={(e) => draft$.set(e.target.value)} />
      <button onClick={() => store$.filter.set("open")}>{filter}</button>
    </section>
  )
}
```

## `useValue`

Use `useValue` as the default read API.

```tsx
const theme = useValue(settings$.theme)
const isSelected = useValue(() => rowId === store$.selectedId.get())
```

Prefer function form when:

- deriving from multiple observables
- calling a helper that internally reads observables
- you want re-render only if computed return value changes

## `observer`

Use only when it reduces hook count or cleans up a component with many observable reads.

```tsx
import { observer, useValue } from "@legendapp/state/react"

const Toolbar = observer(function Toolbar() {
  const q = useValue(search$.query)
  const sort = useValue(search$.sort)
  const count = useValue(results$.count)
  return <div>{q} {sort} {count}</div>
})
```

Do not rely on `observer` + raw `.get()` in render as the main style.

## `Memo`

Use `Memo` for tiny, truly independent reactive subtrees.

```tsx
import { Memo } from "@legendapp/state/react"

<Memo>{store$.count}</Memo>
<Memo>{() => <span>{store$.user.name.get()}</span>}</Memo>
```

Use when parent should stay stable while leaf text/markup updates.

## `$React`

Use for reactive props or two-way bound inputs when it materially reduces parent work.

```tsx
import { $React } from "@legendapp/state/react-web"

<$React.input $value={form$.name} />
<$React.div $className={() => form$.name.get() ? "" : "border-red-500"} />
```

Do not blanket-convert every DOM node to `$React`.

## Side effects

Use observable-native effects when the true dependency is observable state.

```tsx
import { useObserve } from "@legendapp/state/react"

useObserve(() => {
  document.title = page$.title.get()
})
```

Use `useObserveEffect` if it must start after mount.

## Context

Passing observables through Context is good because the observable reference stays stable.
Consumers only update where they observe.
