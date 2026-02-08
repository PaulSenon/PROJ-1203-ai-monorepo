# Decision Matrix

## What to Do Now (MVP)

| Task                                         | Time   | Impact    | Code Changes |
| -------------------------------------------- | ------ | --------- | ------------ |
| Add `contain: layout style paint` to sidebar | 5 min  | HIGH      | CSS only     |
| Add `content-visibility: auto` to items      | 10 min | VERY HIGH | CSS only     |
| Add `scrollbar-gutter: stable` to html       | 2 min  | LOW       | CSS only     |
| Keep ContextMenu disabled                    | 0 min  | HIGH      | Already done |
| Use native `title` for tooltips              | 0 min  | MEDIUM    | Already done |

**Total: ~20 minutes of CSS changes for major improvement**

---

## What to Defer

| Task                           | Why Defer                               | When to Do                    |
| ------------------------------ | --------------------------------------- | ----------------------------- |
| CSS scroll shadows             | Nice-to-have, current JS works          | V1.1                          |
| startTransition + skeleton     | Only if content-visibility isn't enough | V1.1                          |
| tanstack-virtual               | Only if content-visibility fails        | V1.2                          |
| Global ContextMenu             | Complex, breaks easily                  | V2.0                          |
| Global Tooltip                 | Low priority                            | V2.0+                         |
| Desktop animation optimization | Diminishing returns                     | Never (unless users complain) |

---

## What NOT to Do

| Idea                                  | Why Not                           |
| ------------------------------------- | --------------------------------- |
| Fight for O(1) without virtualization | Physically impossible             |
| Build custom ContextMenu from scratch | Radix exists for a reason         |
| Optimize desktop animation            | Not the bottleneck                |
| Add more React.memo                   | You already have it where needed  |
| Build your own virtual scroll         | tanstack-virtual is battle-tested |

---

## Success Criteria

You can ship when:

1. ✅ Modal open doesn't cause visible sidebar jank (containment)
2. ✅ Sidebar with 100 items feels instant (content-visibility)
3. ✅ No context menu per item slowing things down (disabled)
4. ✅ Mobile sidebar open is "acceptable" (<500ms INP)

You do NOT need:

- ❌ Perfect O(1) INP (unrealistic without virtualization)
- ❌ Butter-smooth 1000-item sidebar (unrealistic expectation)
- ❌ Custom global menu implementation (premature optimization)

---

## The Perfectionism Trap

You wrote:

> I need to find the sweet spot of making things good, but not perfect, but still having the path in mind toward the perfect path

**Here's your path:**

```
NOW:        content-visibility + containment = 70% of goal
LATER:      virtualization = 95% of goal
MUCH LATER: global menus = 99% of goal
NEVER:      100% = doesn't exist
```

The remaining 1% would require:

- Custom rendering engine
- WASM-based layout
- Not using React

Not worth it. Ship at 70%, iterate to 95%, call it done.

---

## Quick CSS Snippet to Add Now

```css
/* Add to index.css */

/* 1. Containment */
[data-slot="sidebar"],
[data-sidebar="sidebar"] {
  contain: layout style paint;
}

[data-slot="sidebar-menu-item"],
[data-sidebar="menu-item"] {
  contain: layout style;
  content-visibility: auto;
  contain-intrinsic-block-size: auto 36px;
}

/* 2. Scrollbar stability */
html {
  scrollbar-gutter: stable;
}

/* 3. Force GPU layer on sheet */
[data-slot="sheet-content"] {
  backface-visibility: hidden;
}
```

That's it. 15 lines of CSS. Test it. If it's "good enough," ship it.
