# Implementation Patterns Reference

> Concrete code patterns for each optimization

## 1. CSS Containment (MVP)

Add to your `index.css`:

```css
/* Isolate sidebar from external layout changes */
[data-slot="sidebar"],
[data-sidebar="sidebar"] {
  contain: layout style paint;
}

/* Isolate sidebar content scroll area */
[data-slot="sidebar-content"],
[data-sidebar="content"] {
  contain: strict;
  /* strict = size + layout + style + paint */
}

/* Each sidebar item is self-contained */
[data-slot="sidebar-menu-item"],
[data-sidebar="menu-item"] {
  contain: layout style;
}
```

**Why this works**: `contain` creates containment contexts. Layout changes outside don't propagate in, and vice versa. When modal sets `overflow: clip` on body, the sidebar's internal layout is unaffected.

---

## 2. Content-Visibility (MVP)

Add to your `index.css`:

```css
/* Browser-native virtualization */
[data-slot="sidebar-menu-item"],
[data-sidebar="menu-item"] {
  content-visibility: auto;
  contain-intrinsic-block-size: auto 36px; /* mobile: 40px, desktop: 36px */
}

/* Alternative: apply to the list container */
[data-slot="sidebar-menu"],
[data-sidebar="menu"] {
  /* This makes the whole list use content-visibility */
  /* Less granular but still effective */
}
```

**Why this works**: Browser skips rendering off-screen items entirely. Only visible items (~15-20) get rendered. As user scrolls, items render just-in-time.

**Caveats**:

- May cause scroll position jumps if `contain-intrinsic-size` doesn't match actual size
- `auto` keyword remembers actual size after first render, which helps
- Test with "Find in page" - hidden content may not be searchable

---

## 3. CSS Scroll Shadows (Replaces JS Scroll Detection)

Replace `useScrollEdges` with pure CSS:

```css
/* Apply to sidebar content container */
[data-slot="sidebar-content"] {
  /* Top shadow (appears when scrolled) */
  background:
    /* White cover that scrolls with content */ linear-gradient(
        to bottom,
        var(--sidebar) 30%,
        transparent
      ) top / 100% 40px no-repeat local, /* Shadow that stays fixed */
      linear-gradient(to bottom, rgba(0, 0, 0, 0.08), transparent) top / 100% 8px
      no-repeat scroll,
    /* Bottom cover */ linear-gradient(to top, var(--sidebar) 30%, transparent) bottom /
      100% 40px no-repeat local, /* Bottom shadow */ linear-gradient(
        to top,
        rgba(0, 0, 0, 0.08),
        transparent
      ) bottom / 100% 8px no-repeat scroll;
}

/* For dark mode, adjust shadow opacity */
.dark [data-slot="sidebar-content"],
:root:not(.light) [data-slot="sidebar-content"] {
  background: linear-gradient(to bottom, var(--sidebar) 30%, transparent) top / 100%
      40px no-repeat local, linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.2),
        transparent
      ) top / 100% 8px no-repeat scroll,
    linear-gradient(to top, var(--sidebar) 30%, transparent) bottom / 100% 40px no-repeat
      local, linear-gradient(to top, rgba(0, 0, 0, 0.2), transparent) bottom / 100%
      8px no-repeat scroll;
}
```

This eliminates:

- `useScrollEdges` hook
- `isAtTop` / `isAtBottom` state
- Re-renders on scroll

If you need different header/footer STYLES (not just shadows), keep the JS but move state DOWN to header/footer components using IntersectionObserver directly in those components.

---

## 4. Scrollbar Gutter Stability (MVP)

Add to your `index.css`:

```css
html {
  scrollbar-gutter: stable;
}

/* Or if you only want it during modal open: */
html:has(body[data-scroll-locked]) {
  scrollbar-gutter: stable;
}
```

This reserves space for the scrollbar even when hidden, preventing layout shift when modals open.

---

## 5. GPU-Accelerated Sheet Animation

Your sheet already has `will-change: transform`. Ensure the animation only uses transform:

```css
/* Your current animation is correct */
@keyframes sheet-in {
  from {
    transform: translate3d(-100%, 0, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}

/* Add backface-visibility for extra stability */
[data-slot="sheet-content"] {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
```

---

## 6. Transition + Skeleton Pattern for Sidebar Open

```tsx
// In sidebar.tsx or SidebarProvider
import { useTransition, Suspense, lazy } from "react";

function SidebarProvider({ children, ...props }) {
  const [isPending, startTransition] = useTransition();
  const [openMobile, setOpenMobile] = useState(false);

  const handleOpenMobile = useCallback((open: boolean) => {
    if (open) {
      // Wrap the expensive update in transition
      startTransition(() => {
        setOpenMobile(true);
      });
    } else {
      // Close immediately (cheap)
      setOpenMobile(false);
    }
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        openMobile,
        setOpenMobile: handleOpenMobile,
        isPending, // Expose to children
        ...rest,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// In the Sheet content:
function MobileSidebar() {
  const { isPending } = useSidebar();

  return (
    <SheetContent>
      {isPending ? <SidebarSkeleton /> : <SidebarThreads />}
    </SheetContent>
  );
}

// Simple skeleton:
function SidebarSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-9 animate-pulse rounded-md bg-sidebar-accent/50"
        />
      ))}
    </div>
  );
}
```

**Why this works**: `startTransition` marks the state update as non-urgent. React will:

1. Immediately set `isPending = true` (sync)
2. Show skeleton (fast render)
3. Process the heavy `setOpenMobile(true)` in background
4. Set `isPending = false` when done
5. Show real content

User perceives instant response.

---

## 7. Single Global ContextMenu Pattern (Post-MVP)

If you decide to implement this later:

```tsx
// context-menu-provider.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";

type MenuState = {
  open: boolean;
  itemId: string | null;
  position: { x: number; y: number };
};

type ContextMenuContextValue = {
  openMenu: (itemId: string, position: { x: number; y: number }) => void;
  closeMenu: () => void;
  itemId: string | null;
};

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export function GlobalContextMenuProvider({
  children,
  renderItems,
}: {
  children: React.ReactNode;
  renderItems: (itemId: string) => React.ReactNode;
}) {
  const [state, setState] = useState<MenuState>({
    open: false,
    itemId: null,
    position: { x: 0, y: 0 },
  });

  const contentRef = useRef<HTMLDivElement>(null);

  const openMenu = useCallback(
    (itemId: string, position: { x: number; y: number }) => {
      setState({ open: true, itemId, position });
    },
    []
  );

  const closeMenu = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const value = { openMenu, closeMenu, itemId: state.itemId };

  return (
    <ContextMenuContext.Provider value={value}>
      {children}

      {/* Single portal for all menus */}
      {state.open && (
        <ContextMenuPrimitive.Root
          open={state.open}
          onOpenChange={(open) => !open && closeMenu()}
        >
          {/* Invisible trigger positioned at click location */}
          <ContextMenuPrimitive.Trigger asChild>
            <div
              style={{
                position: "fixed",
                left: state.position.x,
                top: state.position.y,
                width: 1,
                height: 1,
                pointerEvents: "none",
              }}
            />
          </ContextMenuPrimitive.Trigger>

          <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Content
              ref={contentRef}
              className="your-menu-styles"
              style={{
                position: "fixed",
                left: state.position.x,
                top: state.position.y,
              }}
            >
              {state.itemId && renderItems(state.itemId)}
            </ContextMenuPrimitive.Content>
          </ContextMenuPrimitive.Portal>
        </ContextMenuPrimitive.Root>
      )}
    </ContextMenuContext.Provider>
  );
}

// Hook for triggering menu
export function useGlobalContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) throw new Error("Must be within GlobalContextMenuProvider");
  return context;
}

// Usage in sidebar item (no ContextMenu wrapper per item!):
function SidebarItem({ item }) {
  const { openMenu } = useGlobalContextMenu();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openMenu(item.id, { x: e.clientX, y: e.clientY });
  };

  return (
    <div onContextMenu={handleContextMenu} data-item-id={item.id}>
      {item.title}
    </div>
  );
}

// At list level:
function SidebarList({ items }) {
  const menuItems = useCallback((itemId: string) => {
    // These could come from a lookup or be computed
    return (
      <>
        <ContextMenuPrimitive.Item onSelect={() => handlePin(itemId)}>
          Pin
        </ContextMenuPrimitive.Item>
        <ContextMenuPrimitive.Item onSelect={() => handleDelete(itemId)}>
          Delete
        </ContextMenuPrimitive.Item>
      </>
    );
  }, []);

  return (
    <GlobalContextMenuProvider renderItems={menuItems}>
      {items.map((item) => (
        <SidebarItem key={item.id} item={item} />
      ))}
    </GlobalContextMenuProvider>
  );
}
```

**Downsides**:

- Loses Radix's automatic positioning (you'd need @floating-ui)
- Loses some keyboard navigation niceties
- More code to maintain

**When to do this**: Only after virtualization is in place and context menu is a must-have feature.

---

## 8. Single Global Tooltip Pattern (Post-MVP)

Simpler than ContextMenu because tooltips don't need precise positioning:

```tsx
// tooltip-provider.tsx
import { useState, useCallback, useRef, useEffect } from "react";
import {
  FloatingPortal,
  useFloating,
  offset,
  flip,
  shift,
} from "@floating-ui/react";

export function GlobalTooltipProvider({ children }) {
  const [state, setState] = useState({
    text: null as string | null,
    anchor: null as HTMLElement | null,
  });
  const timeoutRef = useRef<number>();

  const { refs, floatingStyles } = useFloating({
    placement: "top",
    middleware: [offset(8), flip(), shift()],
  });

  // Set reference element when anchor changes
  useEffect(() => {
    if (state.anchor) {
      refs.setReference(state.anchor);
    }
  }, [state.anchor, refs]);

  const showTooltip = useCallback((text: string, anchor: HTMLElement) => {
    clearTimeout(timeoutRef.current);
    setState({ text, anchor });
  }, []);

  const hideTooltip = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setState({ text: null, anchor: null });
    }, 100);
  }, []);

  // Event delegation handler
  const handleMouseOver = useCallback(
    (e: React.MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-tooltip]");
      if (target) {
        const text = target.getAttribute("data-tooltip");
        if (text) showTooltip(text, target as HTMLElement);
      }
    },
    [showTooltip]
  );

  const handleMouseOut = useCallback(
    (e: React.MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-tooltip]");
      if (target) {
        hideTooltip();
      }
    },
    [hideTooltip]
  );

  return (
    <div onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}>
      {children}

      {state.text && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50 rounded-md bg-foreground px-3 py-1.5 text-xs text-background"
          >
            {state.text}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}

// Usage - no Tooltip component per item:
function SidebarItem({ item }) {
  return (
    <div data-tooltip={item.title}>
      <span className="truncate">{item.title}</span>
    </div>
  );
}
```

**Much simpler than ContextMenu** because:

- No click positioning needed
- No accessibility concerns (native title already handles a11y)
- Floating-ui handles all positioning

---

## Performance Checklist

Before each optimization, measure:

1. **INP** in Chrome DevTools Performance tab
2. **Layout shift** in Rendering tab (Layout Shift Regions)
3. **Render count** with React DevTools Profiler

After each optimization:

1. Re-measure same metrics
2. Test on throttled CPU (4x slowdown)
3. Test on actual mobile device if possible

Target metrics:

- INP < 200ms (good), < 500ms (acceptable for MVP)
- No layout shift on modal open
- Sidebar items should NOT render when scrolling (with content-visibility)

---

## Migration Order

1. **Day 1**: Add CSS containment + content-visibility
2. **Day 2**: Add scrollbar-gutter + test modal interactions
3. **Day 3**: Replace JS scroll shadows with CSS (if desired)
4. **Day 4**: Add startTransition + skeleton pattern
5. **Later**: Virtualization if still needed
6. **Much Later**: Global ContextMenu/Tooltip patterns
