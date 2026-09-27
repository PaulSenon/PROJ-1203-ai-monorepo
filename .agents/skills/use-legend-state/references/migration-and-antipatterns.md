# Migration And Anti-Patterns

## Prefer these migrations

- `useSelector` -> `useValue`
- `use$` -> `useValue`
- render-time `.get()` pattern -> `useValue`
- `computed(...)` -> `observable(() => ...)` or function child inside observable
- old reactive setup -> `@legendapp/state/react-web` `$React`

## Anti-patterns

### 1. Direct `.get()` throughout render

Bad:

```tsx
const Panel = observer(() => <div>{store$.count.get()}</div>)
```

Better:

```tsx
function Panel() {
  const count = useValue(store$.count)
  return <div>{count}</div>
}
```

### 2. Immutable clone habits

Bad:

```ts
const next = [...list$.get(), item]
list$.set(next)
```

Better:

```ts
list$.push(item)
```

### 3. Mutating raw data from `.get()`

Bad:

```ts
const value = record$.get()
value.name = "Ada"
record$.set(value)
```

Better:

```ts
record$.name.set("Ada")
```

### 4. Parent tracks every child

Bad:

```tsx
const titles = useValue(() => store$.items.map((item) => item.title.get()))
```

Better:

- parent tracks collection shape only
- row tracks its own `title`

### 5. Overusing fine-grained tools

`Memo`, `$React`, and `observer` are powerful, but every one should have a reason.
Default to the simplest correct pattern first.

## Migration notes that matter most

- `observer` still exists, but official guidance moved to `useValue` as the primary read API.
- `useObservable(fn)` is reactive in v3; use `peek()` inside only if you want non-reactive initialization.
- Computeds only recompute while observed; side effects do not belong inside computeds.
