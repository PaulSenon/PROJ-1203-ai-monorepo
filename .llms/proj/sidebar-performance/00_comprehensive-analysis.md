# Sidebar Performance Analysis

> Deep technical analysis of performance issues and pragmatic solutions

## Executive Summary

You have identified **real problems** with **real causes**. Most of what you've tried makes sense. The core insight is correct: **modal opening should be O(1), not O(N)**. However, some "fixes" you're chasing are architectural dead-ends, while others are low-hanging fruit you haven't fully exploited.

**Hard truth**: You cannot have instant INP with 1000 DOM elements and React reconciliation. Period. Virtual scroll isn't a "hide the problem" solution—it's THE solution for lists. Everything else is optimization around the margins.

---

## Problem 1: CSS Reflow on Modal Open

### What You Described

> CSS repaint, on modal-like ui, when long list of sidebar items, because when doing the overlay with overflow clip/hidden on background content, it reflows the sidebar

### What's Actually Happening

When Radix's Dialog/Sheet opens, it sets `body[data-scroll-locked]` with `overflow: hidden`. You've already patched this with `overflow: clip !important` in your CSS:

```css:192:197:apps/web/src/index.css
html body[data-scroll-locked],
html body[data-scroll-locked][style] {
  overflow: clip !important;
  ...
}
```

**This is correct.** `overflow: clip` doesn't create a scroll container, so it shouldn't trigger reflow. BUT:

### The Real Culprit

Your sidebar's desktop layout uses `transition-[width]` on the gap element:

```tsx:226:235:apps/web/src/components/ui/sidebar.tsx
<div
  data-slot="sidebar-gap"
  className={cn(
    "relative w-(--sidebar-width) bg-transparent transition-[width] duration-(--duration-fast) ease-(--ease-default)",
    ...
  )}
/>
```

**Width transitions ALWAYS trigger layout.** When any ancestor changes its layout containment (like body overflow), the browser must recalculate widths. With 1000 children, this is expensive.

### Solutions

| Solution                                       | Difficulty | Impact | MVP?   |
| ---------------------------------------------- | ---------- | ------ | ------ |
| CSS `contain: layout style` on sidebar         | Easy       | Medium | ✅ YES |
| `content-visibility: auto` on off-screen items | Easy       | High   | ✅ YES |
| Replace width transition with transform        | Medium     | High   | No     |
| `scrollbar-gutter: stable` on html             | Trivial    | Low    | ✅ YES |

#### MVP Fix: CSS Containment

Add to your sidebar container:

```css
[data-slot="sidebar"] {
  contain: layout style paint;
}
```

This tells the browser: "Changes outside this element cannot affect its internal layout, and vice versa." The reflow from modal open won't propagate into the sidebar's children.

#### MVP Fix: content-visibility

Add to each sidebar item:

```css
[data-slot="sidebar-menu-item"] {
  content-visibility: auto;
  contain-intrinsic-size: auto 36px; /* your item height */
}
```

This is **free virtual scroll without React**. Browser skips rendering off-screen items entirely. You get 90% of virtualization benefit with 0 code changes to React.

⚠️ **Caveat**: `content-visibility: auto` can cause scroll position issues. Test thoroughly.

---

## Problem 2: Desktop Sidebar Animation Performance

### What You Described

> sidebar transition animation on desktop... because we have inset etc, we HAVE TO animate other things than just translating the content

### Analysis

Your desktop sidebar animates these properties:

- `width` (gap element) → TRIGGERS LAYOUT
- `left`/`right` (container) → TRIGGERS LAYOUT (when not using transform)

The inset variant's problem: the rounded corners and margins (`m-2`, `rounded-xl`) create visual complexity that requires layout changes.

### The Hard Truth

You cannot animate `width` performantly. It will always be slower than `transform`. The question is: do you NEED the inset animation to resize, or can you fake it?

### Solutions

| Solution                                   | Difficulty | Impact | MVP?                |
| ------------------------------------------ | ---------- | ------ | ------------------- |
| Accept slightly slower animation           | Zero       | Zero   | ✅ YES (do nothing) |
| Use transform + clip-path instead of width | Hard       | High   | No                  |
| Separate content layer with own transform  | Hard       | High   | No                  |
| Reduce animation duration                  | Trivial    | Low    | ✅ YES              |

#### Pragmatic MVP: Just Accept It

With CSS containment from Problem 1, the animation will be "good enough." The sidebar animation isn't your INP problem—it's the modal open. Don't chase this rabbit hole.

#### If You Must Fix It Later

The "proper" fix involves:

1. Always keep sidebar at full width
2. Use `transform: translateX(-100%)` to hide
3. Use `clip-path` on the inset wrapper to create the rounded appearance
4. Animate `transform` only

This is complex and breaks your current structure. Not MVP.

---

## Problem 3: Sidebar Items Rerender on Scroll State

### What You Described

> sidebar items rerender on scrolled to top/bottom (because updating the header/footer design)

### Analysis

Looking at your code:

```tsx:51:52:apps/web/src/components/ui-custom/sidebar/sidebar.tsx
const { isAtTop, isAtBottom, topRef, bottomRef } =
  useScrollEdges(scrollContainerRef);
```

These values change → `Sidebar` re-renders → `SidebarThreads` gets new props → even with `React.memo`, the closure over `threads` array reference might change.

### Solutions

| Solution                                           | Difficulty | Impact | MVP?   |
| -------------------------------------------------- | ---------- | ------ | ------ |
| Move scroll state to header/footer components only | Medium     | Medium | ✅ YES |
| Use CSS-only scroll shadows                        | Easy       | Medium | ✅ YES |
| Wrap threads in stable context                     | Easy       | Low    | No     |

#### MVP Fix: CSS Scroll Shadows

Replace JavaScript scroll detection with CSS:

```css
.sidebar-content {
  background:
    /* Shadow at top */ linear-gradient(white 30%, rgba(255, 255, 255, 0)) center
      top, /* Shadow at bottom */ linear-gradient(
        rgba(255, 255, 255, 0),
        white 70%
      ) center bottom,
    /* Shadow covers */ radial-gradient(
        farthest-side at 50% 0,
        rgba(0, 0, 0, 0.2),
        rgba(0, 0, 0, 0)
      ) center top, radial-gradient(
        farthest-side at 50% 100%,
        rgba(0, 0, 0, 0.2),
        rgba(0, 0, 0, 0)
      ) center bottom;
  background-repeat: no-repeat;
  background-size: 100% 40px, 100% 40px, 100% 14px, 100% 14px;
  background-attachment: local, local, scroll, scroll;
}
```

This creates scroll shadows **without JavaScript**, so no re-renders.

---

## Problem 4: Sidebar Open INP on Mobile

### What You Described

> I want the sidebar open to be O(1) operation, not impacted by how many item there are in

### The Hard Truth

**This is impossible without virtualization.** Here's why:

1. React must reconcile N components
2. Each component must execute its function
3. Each component must diff its output
4. Browser must paint N elements

You can DEFER this work (useDeferredValue, startTransition), but you cannot eliminate it.

### What You've Already Done Right

1. `useDeferredValue(threads)` - Correct
2. `React.Activity` for hidden mode - Correct (keeps tree alive)
3. `Persisted` pattern for mobile - Smart

### What's Still Slow

When sidebar opens:

1. `React.Activity` switches to `visible`
2. All effects re-run
3. All 1000 items re-render

### Solutions

| Solution                          | Difficulty | Impact        | MVP?                   |
| --------------------------------- | ---------- | ------------- | ---------------------- |
| Virtual scroll (tanstack-virtual) | Medium     | **VERY HIGH** | Should be MVP          |
| Progressive rendering with chunks | Medium     | Medium        | Alternative            |
| Skeleton + lazy hydration         | Hard       | High          | No                     |
| content-visibility CSS            | Easy       | High          | ✅ YES (see Problem 1) |

#### MVP: content-visibility IS Your Virtualization

Seriously. Apply `content-visibility: auto` to your items. The browser will:

1. Not render off-screen items
2. Only render ~15-20 visible items
3. Progressively render as you scroll

This is essentially browser-native virtualization. It won't make INP O(1), but it will make it O(visible_items) instead of O(total_items).

#### When You Must Do Real Virtualization

If `content-visibility` isn't enough, use `@tanstack/react-virtual`. But you said you have "other plans" for this later. **I'd argue this IS your MVP path**, not something to defer.

---

## Problem 5: ContextMenu Performance (N Contexts, N Portals)

### What You Described

> Currently I do the naive approach of adding a ContextMenu context per item, and this slows down... When I remove it it speeds INP by a factor 2

### Analysis

Your current structure (commented out, but conceptually):

```tsx
// Per item:
<ActionMenu items={menuItems}>
  <ActionMenuTrigger>
    <Link>...</Link>
  </ActionMenuTrigger>
  <ActionMenuContent />
</ActionMenu>
```

**Why this is slow:**

1. N `ContextMenu` components = N React contexts
2. Each `ContextMenuTrigger` subscribes to its parent context
3. Each potentially renders a portal (even if empty when closed)
4. Context propagation is O(N) on any context change

### The Global Menu Pattern

You tried making a single global ContextMenu. The problem: Radix's `ContextMenuTrigger` is tightly coupled to its parent `ContextMenu`. The trigger MUST be a child of the menu.

### Solutions

| Solution                                           | Difficulty | Impact         | MVP?   |
| -------------------------------------------------- | ---------- | -------------- | ------ |
| Keep menu disabled (current state)                 | Zero       | High (removed) | ✅ YES |
| Native browser context menu                        | Easy       | Low quality    | No     |
| Custom event-delegation menu                       | Hard       | High           | No     |
| Single controlled ContextMenu + event interception | Medium     | High           | Maybe  |

#### Pragmatic MVP: Don't Have Context Menus Per Item

I notice you already commented out the ActionMenu:

```tsx:247:248:apps/web/src/components/ui-custom/sidebar/primitives/sidebar-thread-item.tsx
{/* <ActionMenu items={menuItems}> */}
```

**This is the right call for MVP.** The quick actions on hover (Pin, Delete) work without context menu. Add context menu back only when you implement virtualization.

#### If You MUST Have Context Menu

The pattern that works:

1. **Single ContextMenu at list level** (not per item)
2. **Custom trigger handling**: Don't use `ContextMenuTrigger`. Instead:
   - Listen for `contextmenu` event on the list container
   - Determine which item was clicked from `event.target`
   - Store clicked item ID in state
   - Programmatically position and open the single ContextMenu
3. **Content renders based on stored item ID**

```tsx
// Pseudocode structure:
function SidebarMenu({ items }) {
  const [menuState, setMenuState] = useState({ open: false, itemId: null, position: {x:0, y:0} });

  const handleContextMenu = (e) => {
    const itemId = e.target.closest('[data-item-id]')?.dataset.itemId;
    if (itemId) {
      e.preventDefault();
      setMenuState({ open: true, itemId, position: { x: e.clientX, y: e.clientY }});
    }
  };

  return (
    <div onContextMenu={handleContextMenu}>
      {items.map(item => (
        <SidebarItem key={item.id} data-item-id={item.id} item={item} />
      ))}

      <ContextMenuRoot open={menuState.open} onOpenChange={...}>
        <ContextMenuContent style={{ position: 'fixed', left: menuState.position.x, top: menuState.position.y }}>
          {menuState.itemId && <MenuItems itemId={menuState.itemId} />}
        </ContextMenuContent>
      </ContextMenuRoot>
    </div>
  );
}
```

**Difficulty: Medium-High.** You lose Radix's built-in positioning, accessibility, and keyboard handling. You'd need to reimplement or use a lower-level library like `@floating-ui/react`.

---

## Problem 6: Tooltip Performance

### What You Described

> really similar to the contextMenu, is for having nice tooltips per item (to show full name not truncated) but same, the naive approach it soo laggy

### Analysis

Same pattern as ContextMenu: N Tooltips = N contexts + N potential portals.

### Solutions

| Solution                             | Difficulty | Impact         | MVP?   |
| ------------------------------------ | ---------- | -------------- | ------ |
| Use native `title` attribute         | Trivial    | Medium quality | ✅ YES |
| Single tooltip with event delegation | Medium     | High           | Maybe  |
| No tooltips (rely on hover actions)  | Zero       | Acceptable     | ✅ YES |

#### MVP: Native title Attribute

You already have this:

```tsx:149:150:apps/web/src/components/ui-custom/sidebar/primitives/sidebar-thread-item.tsx
title={srTitle}
```

The native `title` tooltip is ugly but performant. For MVP, this is fine.

#### Better Solution: Single Floating Tooltip

Similar to context menu pattern:

1. Single `Tooltip` at list level
2. Track hovered item with `onMouseEnter` event delegation
3. Position tooltip near hovered item

This is cleaner than ContextMenu because tooltips don't need precise click positioning.

---

## Problem 7: React.Activity and Async Rendering

### What You Described

> I wanted to find a way to make the sidebar heavy rendering be async or suspensable somehow... I partially did it with deferred value

### Analysis

You're using `React.Activity` correctly:

```tsx:119:122:apps/web/src/components/ui-custom/utils/persisted.tsx
<React.Activity mode={backgroundMode ? "hidden" : "visible"}>
  {createPortal(children, hostEl)}
</React.Activity>
```

When `mode="hidden"`:

- Effects unmount
- Updates are deferred to idle time
- **But the tree stays mounted** (state preserved)

When switching to `visible`:

- Effects re-mount
- Pending updates flush
- Tree re-renders

### The Issue

Even with `Activity`, when you open the sidebar:

1. Activity switches from `hidden` → `visible`
2. React must reconcile the tree
3. All 1000 items process

### Solutions

| Solution                             | Difficulty | Impact              | MVP?   |
| ------------------------------------ | ---------- | ------------------- | ------ |
| startTransition for open             | Easy       | Medium              | ✅ YES |
| Show skeleton during transition      | Medium     | High perceived perf | ✅ YES |
| Suspense boundary with lazy children | Hard       | High                | No     |

#### MVP: Transition + Skeleton

```tsx
const [isPending, startTransition] = useTransition();

const handleOpen = () => {
  startTransition(() => {
    setOpenMobile(true);
  });
};

// In render:
{
  isPending && <SidebarSkeleton />;
}
{
  !isPending && <SidebarContent />;
}
```

This shows instant feedback (skeleton), while React does its work in the background.

---

## Final Recommendations

### Must-Do for MVP (Do These First)

1. **Add CSS containment** to sidebar:

   ```css
   [data-slot="sidebar"] {
     contain: layout style paint;
   }
   ```

2. **Add content-visibility** to sidebar items:

   ```css
   [data-slot="sidebar-menu-item"] {
     content-visibility: auto;
     contain-intrinsic-size: auto 36px;
   }
   ```

3. **Keep ContextMenu disabled** until you have virtualization

4. **Use native `title` attribute** for tooltips instead of Radix Tooltip

5. **Add `scrollbar-gutter: stable`** to html to prevent layout shifts

### Should-Do (High Impact, Medium Effort)

1. **Replace scroll state JavaScript** with CSS scroll shadows
2. **Add startTransition + skeleton** for sidebar open
3. **Implement virtualization** with @tanstack/react-virtual

### Can-Skip (Perfectionist Traps)

1. Desktop sidebar animation optimization (diminishing returns)
2. Single global ContextMenu pattern (complex, fragile)
3. Custom tooltip implementation (native title is fine for MVP)

---

## On Perfectionism

You wrote:

> I need to find the sweet spot of making things good, but not perfect, but still having the path in mind toward the perfect path

Here's the path:

1. **MVP**: CSS containment + content-visibility + no per-item menus/tooltips
2. **V1.1**: Virtualization with tanstack-virtual
3. **V1.2**: Single global ContextMenu with event delegation
4. **V2.0**: Single global Tooltip with event delegation

The MVP fixes give you 70% of the performance benefit with 5% of the effort. Virtualization gets you to 95%. The global menu patterns are polish.

**Your sidebar will never be O(1) with 1000 items and no virtualization.** Accept this. The goal is "fast enough that users don't notice," not "theoretically optimal."
