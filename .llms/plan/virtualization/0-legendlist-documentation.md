# LegendList Web Beta - reverse engineered docs for our virtualization use-cases

## Scope

This doc is derived only from local source, tests, examples, and git history in:

- `.llms/git-references/legendlist/src/**`
- `.llms/git-references/legendlist/example-web/src/**`
- `.llms/git-references/legendlist/__tests__/**`
- `.llms/git-references/legendlist/CHANGELOG.md`
- git log from the same repo

Target package snapshot analyzed: `@legendapp/list@3.0.0-beta.37` (`package.json`).

Confidence: 99% for behaviors explicitly described below (all backed by code/tests/commits in this repo snapshot).

---

## TL;DR for our 2 integration points

1) Sidebar (own scroll container)

- Use normal `LegendList` (no `useWindowScroll`).
- Prefer fixed-size rows with `getFixedItemSize`.
- Use `recycleItems` if row local state is externalized.
- Keep `keyExtractor` stable and deterministic.

2) Chat conversation (window scroll, bottom anchored, streaming, prepend history)

- Use `useWindowScroll` + `alignItemsAtEnd`.
- Initialize at bottom with `initialScrollAtEnd` (preferred) or `initialScrollIndex={last}`.
- For chat append behavior: enable `maintainScrollAtEnd`.
- For prepend/top history stability: enable `maintainVisibleContentPosition` with `data: true`.
- Keep message IDs stable forever; if mutating data array in place, update `dataVersion`.

---

## Import + base API surface (web)

Use:

```tsx
import { LegendList, type LegendListRef } from "@legendapp/list/react";
```

Important web props (from `src/components/LegendList.tsx` + `src/types.base.ts`):

- `data`, `renderItem`, `keyExtractor`
- `estimatedItemSize` (default `100`)
- `drawDistance` (default `250`)
- `recycleItems` (default `false`)
- `maintainVisibleContentPosition`
- `maintainScrollAtEnd`
- `maintainScrollAtEndThreshold` (default `0.1`)
- `onStartReached`, `onStartReachedThreshold` (default `0.5`)
- `onEndReached`, `onEndReachedThreshold` (default `0.5`)
- `initialScrollIndex`, `initialScrollAtEnd`, `initialScrollOffset`
- `alignItemsAtEnd`
- `useWindowScroll` (web only)
- `waitForInitialLayout` (actual runtime default here is `true`)

Note: type comments and runtime defaults are not always aligned in this beta; runtime behavior should be taken from `LegendList.tsx`.

---

## Mental model (what the web implementation actually does)

LegendList renders a pooled set of absolutely-positioned containers and moves them to match virtualized indices.

- Container pool created in `doInitialAllocateContainers`.
- Visible and buffered ranges computed in `calculateItemsInView`.
- Item sizes measured via `Container` + `useOnLayoutSync` + `updateItemSize`.
- Scroll adjustments for stability use `ScrollAdjustHandler` + `requestAdjust` + `ScrollAdjust`.

Key implications:

- Stable `keyExtractor` is critical. Without it, data changes can reset caches and destabilize scroll.
- Size estimation quality strongly affects first-position accuracy and smoothness.
- Virtualization is index/key driven; mutating arrays in place requires `dataVersion` bumps.

---

## Window scroll mode (`useWindowScroll`) details

Source: `ListComponentScrollView.tsx`, `webScrollUtils.ts`, commits `068ea1d`, `72295d8`.

When `useWindowScroll` is true:

- Scroll events are attached to `window`, not inner div.
- Local list offset is computed as `windowScroll - listDocumentTop` and clamped.
- Vertical viewport size for calculations is `window.innerHeight`.
- Content size is measured from the list content node, not full document.
- Programmatic `scrollTo*` converts list-local offsets to window absolute positions.

Constraints:

- `useWindowScroll` is ignored/unsupported when `renderScrollComponent` is provided (dev warning in `LegendList.tsx`).
- The list still renders a wrapper element; avoid wrapping it inside competing scroll containers.

---

## MVCP and stability internals (critical for chat + prepend)

MVCP = maintain visible content position.

Normalization (`normalizeMaintainVisibleContentPosition.ts`):

- `undefined` -> `{ data: false, size: true }`
- `true` -> `{ data: true, size: true }`
- `false` -> `{ data: false, size: false }`
- object -> `data` default false, `size` default true

Behavior split:

- `size`: keeps viewport stable on measured size/layout changes.
- `data`: keeps viewport stable when `data` array changes (prepend/insert/delete effects).

Web-specific anchor lock (`mvcp.ts`, commits `d24a9d9`, `d15f8c5`):

- short-lived anchor lock with TTL ~300ms
- lock released after 2 quiet passes (no meaningful diff)
- fallback to other visible anchors if target anchor disappears
- optional filtering via `shouldRestorePosition`

Active-mode gate (`isInMVCPActiveMode.ts`):

- while active, recalculation is more aggressive (even where cached range could skip work)
- used to reduce transient jumps while layouts settle

---

## Threshold behavior for top/bottom callbacks

Core threshold logic is `checkThreshold.ts` with hysteresis multiplier `1.3`.

Bottom (`checkAtBottom.ts`):

- uses `distanceFromEnd = contentSize - scroll - scrollLength - insetEnd`
- sets `isAtEnd` using `maintainScrollAtEndThreshold`
- can re-fire on content/data changes while still inside threshold window

Top (`checkAtTop.ts`, commits `e005539`, `8a03ce0`):

- suppressed during `initialScroll` and while `scrollingTo`
- data-epoch aware, includes MVCP-settle gating
- can re-fire once per data-change epoch when settled
- includes immediate reset logic when data change pushes scroll outside top window

Practical impact for infinite top-loading:

- `onStartReached` is robust but intentionally de-bounced by state transitions.
- you still need app-level request de-duping (`isLoadingOlder`, cursor guard).

---

## Initial bottom anchor behavior

Best options for chat open-at-bottom:

1. `initialScrollAtEnd` (preferred)
2. `initialScrollIndex={data.length - 1}` with `viewPosition: 1` style behavior

Why `initialScrollAtEnd` is better here:

- runtime builds the proper last-index target
- adjusts `viewOffset` for `stylePaddingBottom`
- after footer layout, recalculates target offset to include footer size

Related code paths:

- `LegendList.tsx` (`initialScrollProp`, `onLayoutFooter`, `doInitialScroll`)
- `setDidLayout.ts` runs a second-pass `scrollToIndex` on next frame for settling

---

## Maintain scroll at end (append + streaming)

`doMaintainScrollAtEnd.ts` behavior:

- only auto-scrolls if currently near end (`state.isAtEnd`) and layout ready
- schedules `scrollToEnd` on next animation frame
- marks temporary `maintainingScrollAtEnd` flag

`maintainScrollAtEnd` supports:

- `true` (all trigger points)
- object with granular flags:
  - `onDataChange`
  - `onItemLayout`
  - `onLayout`

Trigger points in code:

- data change: `checkResetContainers.ts`
- item size change: `updateItemSize.ts`
- layout change: `handleLayout.ts`

For streaming chat, using `true` is simplest and safe.

---

## Sidebar recipe (internal scroll container)

Use this for the left navigation/threads pane.

```tsx
import { LegendList } from "@legendapp/list/react";

const ROW_H = 56;

<LegendList
  data={threads}
  keyExtractor={(t) => t.id}
  estimatedItemSize={ROW_H}
  getFixedItemSize={() => ROW_H}
  recycleItems
  drawDistance={180}
  renderItem={({ item }) => <ThreadRow thread={item} />}
  style={{ flex: 1, minHeight: 0 }}
/>;
```

Notes:

- fixed size + recycle gives highest stability/perf for dense sidebars
- if row has local uncontrolled state, either externalize it or disable recycling

---

## Chat recipe (window scroll + bottom anchor + prepend)

```tsx
import { LegendList, type LegendListRef } from "@legendapp/list/react";

const listRef = useRef<LegendListRef | null>(null);

<LegendList
  data={messages}
  keyExtractor={(m) => m.id}
  renderItem={({ item }) => <MessageRow message={item} />}
  useWindowScroll
  alignItemsAtEnd
  initialScrollAtEnd
  estimatedItemSize={92}
  maintainScrollAtEnd
  maintainVisibleContentPosition={{
    data: true,
    size: true,
    shouldRestorePosition: (item) => !item.deleted,
  }}
  onStartReached={loadOlderIfNeeded}
  onStartReachedThreshold={0.35}
  style={{ minHeight: 0 }}
/>
```

App-side requirements for this to stay stable:

- never recycle message ids
- do not regenerate keys between renders
- gate top-load requests in app state (prevent parallel prepends)
- if mutating array in place, change `dataVersion`

---

## Ref methods useful for production chat

From `createImperativeHandle.ts`:

- `scrollToEnd({ animated, viewOffset })`
- `scrollToIndex({ index, viewOffset, viewPosition, animated })`
- `scrollToOffset({ offset, animated })`
- `getState()` exposes:
  - `isAtEnd`, `isAtStart`
  - `start/end` and buffered ranges
  - per-index positions/sizes accessors
  - `listen(...)` for internal signal subscriptions

`scrollToEnd` already compensates for footer + bottom padding.

---

## Important caveats and gotchas

1. `useWindowScroll` + custom `renderScrollComponent` is not supported.
2. View-position math can be less accurate when item size is unknown (explicit TODO in source).
3. If no `keyExtractor`, data changes can clear size/position caches (scroll instability risk).
4. `waitForInitialLayout` runtime default is `true`; can delay first paint intentionally.
5. DOM order re-sorting is delayed (`useDOMOrder`), mainly for DOM/accessibility ordering cleanup.

---

## Commit-derived timeline (relevant changes)

- `068ea1d`: first `useWindowScroll` support
- `72295d8`: hardening for target resolution/horizontal/clamping in window mode
- `d24a9d9`: web MVCP anchor lock lifecycle + fallback
- `d15f8c5`: keep MVCP active while layout settles
- `8a03ce0`: stronger `checkAtTop` for fast upward scroll + data epochs
- `4667066`: smoother animated scroll completion on web
- `46b0971`: top offset fix only for index-based math

These commits match current behavior in the analyzed source snapshot.

---

## Recommended starting config for our app

Sidebar:

- fixed-size rows
- `recycleItems: true`
- `drawDistance: 150-220`
- no `useWindowScroll`

Chat conversation:

- `useWindowScroll: true`
- `alignItemsAtEnd: true`
- `initialScrollAtEnd: true`
- `maintainScrollAtEnd: true`
- `maintainVisibleContentPosition: { data: true, size: true }`
- `onStartReachedThreshold: 0.3-0.4` with app-level load guard

This is the safest path for: bottom-start, streaming appends, top infinite prepend, and stable viewport anchoring.
