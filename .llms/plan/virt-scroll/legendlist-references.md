# LegendList Web Reference for Chat Virtualization

## Status

- Library: `@legendapp/list` `3.0.0-beta.33` (web support is beta)
- Web import target: `@legendapp/list/react`
- Scope of this doc: React web usage, bidirectional infinite chat, project-fit notes

## TL;DR

- Use `LegendList` from `@legendapp/list/react`.
- For chat (non-inverted):
  - `alignItemsAtEnd`
  - `maintainScrollAtEnd`
  - `maintainVisibleContentPosition`
  - `initialScrollIndex={data.length - 1}` (or `initialScrollAtEnd`)
- For bidirectional history:
  - prepend on `onStartReached`
  - optional append on `onEndReached`
  - keep stable keys
- Tune `estimatedItemSize` first. Most jitter starts there.

---

## Install and Import

```bash
pnpm add @legendapp/list
```

```tsx
import { LegendList, type LegendListRef } from "@legendapp/list/react";
```

Notes:

- Root import `@legendapp/list` still works but not strict platform typing.
- For web, always prefer `@legendapp/list/react`.

---

## Quickstart (Web)

```tsx
import { LegendList } from "@legendapp/list/react";

type Row = { id: string; title: string };

export function BasicList({ rows }: { rows: Row[] }) {
  return (
    <LegendList<Row>
      data={rows}
      keyExtractor={(row) => row.id}
      estimatedItemSize={56}
      renderItem={({ item }) => <div style={{ padding: 12 }}>{item.title}</div>}
      style={{ flex: 1, minHeight: 0 }}
    />
  );
}
```

Non-negotiable layout rule:

- Ensure parent container and list use `minHeight: 0` in flex layouts.

---

## Bidirectional Chat Quickstart (Web)

```tsx
import { LegendList, type LegendListRef } from "@legendapp/list/react";
import React from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type Props = {
  messages: ChatMessage[];
  loadOlder: () => void;
  loadNewer?: () => void;
};

export function ChatVirtualList({ messages, loadOlder, loadNewer }: Props) {
  const ref = React.useRef<LegendListRef | null>(null);

  return (
    <LegendList<ChatMessage>
      ref={ref}
      data={messages}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => (
        <div
          style={{
            display: "flex",
            justifyContent: item.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              maxWidth: "75%",
              borderRadius: 16,
              padding: "10px 14px",
              background: item.role === "user" ? "#0f172a" : "#e2e8f0",
              color: item.role === "user" ? "#fff" : "#0f172a",
            }}
          >
            {item.text}
          </div>
        </div>
      )}
      style={{ flex: 1, minHeight: 0 }}
      contentContainerStyle={{ padding: 16 }}
      estimatedItemSize={80}
      initialScrollIndex={Math.max(0, messages.length - 1)}
      alignItemsAtEnd
      maintainScrollAtEnd
      maintainScrollAtEndThreshold={0.1}
      maintainVisibleContentPosition
      onStartReached={loadOlder}
      onStartReachedThreshold={0.5}
      onEndReached={loadNewer}
      onEndReachedThreshold={0.5}
      drawDistance={1000}
    />
  );
}
```

---

## API Reference (Web Chat-Focused)

## Must Have

- `data`
  - list source array.
- `renderItem`
  - row renderer.
- `keyExtractor`
  - stable id per item. required for live updates and prepend stability.
- `style={{ flex: 1, minHeight: 0 }}`
  - avoid container collapse and wrong measurements.
- `estimatedItemSize` or `getFixedItemSize`
  - critical for initial placement and smoothness.

## Recommended (Chat)

- `alignItemsAtEnd`
  - for bottom-aligned short conversations without inverted list.
- `maintainScrollAtEnd`
  - auto-follow latest when user near bottom.
- `maintainScrollAtEndThreshold`
  - near-bottom threshold (fraction of viewport).
- `maintainVisibleContentPosition`
  - stabilizes visible content during prepend and size changes.
- `initialScrollIndex={last}` or `initialScrollAtEnd`
  - open at end for current bottom-anchor behavior.

## Situational

- `onStartReached` + `onStartReachedThreshold`
  - load older history when user reaches top region.
- `onEndReached` + `onEndReachedThreshold`
  - optional forward pagination.
- `drawDistance`
  - extra render buffer before/after viewport.
- `recycleItems`
  - perf boost, but row local state can leak across reused containers.
- `getEstimatedItemSize`
  - dynamic estimate by item shape.
- `dataVersion`
  - force data-change recognition when mutating array in place.

## Useful Ref Methods

- `getState()`
  - includes `isAtEnd`, `isAtStart`, ranges, positions.
- `scrollToEnd({ animated })`
- `scrollToIndex({ index, viewOffset, viewPosition, animated })`
- `scrollToOffset({ offset, animated })`

---

## Behavior Notes That Matter in Chat

## Thresholds are viewport fractions

- `onStartReachedThreshold=0.5` means half viewport distance, not 0.5px.

## MVCP defaults

- `maintainVisibleContentPosition` omitted -> size stabilization on, data anchoring off.
- `true` -> size + data anchoring both on.
- `false` -> both off.

## Chat without inversion

- intended pattern is non-inverted DOM.
- combine `alignItemsAtEnd` + `maintainScrollAtEnd`.

## Recycling caution

- If `recycleItems` is true, avoid unmanaged local row state.
- keep row rendering pure from item props.

---

## Performance Tuning Playbook (INP-Oriented)

1. Start by calibrating `estimatedItemSize` using median rendered row height.
2. Keep `keyExtractor` stable and deterministic.
3. Keep message row props minimal and memo-friendly.
4. Increase `drawDistance` only if fast-scroll blanking appears.
5. Enable `recycleItems` only after row-state audit.
6. Avoid expensive per-row effects during active stream updates.

---

## Integration Guidance for Current Project

## Sidebar (simpler first)

- Replace current thread `.map` render with LegendList.
- Keep existing sidebar item component and behaviors.
- Keep load-more wired (currently bottom-triggered) using LegendList reach callback.
- Remove fake CSS virtualization path only after parity verified.

## Conversation (second)

- Replace plain message `.map` with LegendList.
- Keep last-assistant reserve rules exactly unchanged.
- Keep current layout behavior unchanged (no visible structural drift).
- Keep anchor model checkpoint-based. Current checkpoint is at bottom; adapter should stay ready to move to true last-read checkpoint later.
- Add placeholder `onLoadOlder` callback position in API, but do not wire fetch yet.

---

## Known Caveats

- Web support is still beta; ship behind feature flag first.
- Treat `waitForInitialLayout` as non-core for web rollout; validate in app before relying on it.
- Validate momentum/end event assumptions in your own UI flow; prefer state-driven (`getState().isAtEnd`) decisions.

---

## Suggested Spike Checklist (before full rollout)

1. Sidebar virtualization with existing thread dataset and real-time updates.
2. Conversation virtualization with stream updates and long markdown messages.
3. Verify no regressions in:
   - last assistant reserve space
   - scroll-to-bottom button behavior
   - initial open anchor behavior
   - mobile sticky input overlap
4. Profile interaction latency before/after.

---

## References

- `.llms/git-references/legendlist/README.md`
- `.llms/git-references/legendlist/example-web/src/examples/ChatExample.tsx`
- `.llms/git-references/legendlist/example-web/src/examples/BidirectionalInfiniteListExample.tsx`
- `.llms/git-references/legendlist/src/types.web.ts`
- `.llms/git-references/legendlist/src/types.base.ts`
- `.llms/git-references/legendlist/src/components/ListComponentScrollView.tsx`
- `.llms/git-references/legendlist/src/components/LegendList.tsx`
- `.llms/git-references/legendlist/src/utils/normalizeMaintainVisibleContentPosition.ts`
