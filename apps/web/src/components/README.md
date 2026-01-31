# Component Architecture Guide

## Current State

> **Migration in Progress**: The current codebase has inconsistent patterns from multiple iterations. New code MUST follow this guide. When modifying existing files, progressively refactor toward these patterns.

---

## The 3-Layer Model

Components are organized by **dependency direction**, not complexity.

```
L1: External ──────────────────────────────────────────────────────
    Immutable registries (shadcn, ai-elements)
    Location: ui/, ai-elements/
    Rule: NEVER edit. Compose/wrap instead.
                              │
                              ▼
L2: Design System ─────────────────────────────────────────────────
    App-agnostic compound components
    Location: ui-custom/[domain]/
    Rule: NO app hooks, NO app types. Props/context only.
                              │
                              ▼
L3: App Layer ─────────────────────────────────────────────────────
    Feature-specific components with app awareness
    Location: [feature]/
    Rule: Uses hooks, knows app types, composes L2.
```

---

## Layer Definitions

### L1: External (Immutable)

**Location**: `ui/`, `ai-elements/`

Third-party registries installed via CLI. Never modify directly.

- `ui/` — shadcn/ui components
- `ai-elements/` — Vercel AI Elements

**When updating**: Re-run CLI, resolve conflicts in L2 wrappers.

---

### L2: Design System (App-Agnostic)

**Location**: `ui-custom/[domain]/`

Compound component sets that embed your design decisions but know nothing about your app's domain (no `Thread`, `User`, `Message` types).

L2 may accept L1 contract types it wraps (e.g., `UIMessage`), but never app-extended types (e.g., `MyUIMessage`).

**Characteristics**:
- Wraps/composes L1 primitives
- Exports namespace object: `Message.*`, `Sidebar.*`, `ChatInput.*`
- May have internal context for compound component state
- Embeds styling, spacing, visual decisions
- Receives all data via props or context injection
- May import L1 types it wraps (e.g., `UIMessage`)

**Example domains**:
```
ui-custom/
  primitives/      # Browser/a11y fixes to L1 (textarea, etc.)
  sidebar/         # Sidebar.* compound
  chat/            # Message.*, ChatInput.* compounds
  user-profile/    # UserProfile.* compound
  feedback/        # StatusBlock.* compound
  actions/         # ActionList.* compound
```

**What belongs here**:
- `Sidebar.Root`, `Sidebar.Item`, `Sidebar.Footer`
- `Message.Root`, `Message.Content`, `Message.Actions`
- Generic slots and layouts, no app logic

**Domain, not feature**:
- L2 groups by UI concern (reasoning, status, actions), not by app feature (chat).
- L2 can be multi-file per domain; each file exports its own namespace object.

---

### L3: App Layer (Feature-Specific)

**Location**: `[feature]/` (e.g., `chat/`, `sidebar/`, `settings/`)

Components that know about your app's domain. They use hooks, reference app types, and make app-specific composition decisions.

For complex features with multiple variants, create a subfolder and use the entry file named after the folder (e.g., `message/message.tsx`).

**L3 has two concerns** (can be combined or separated):

| Concern | Purpose | When to separate |
|---------|---------|------------------|
| **Adapter** | Hooks → data gathering | Complex hook logic |
| **Layout** | Data → JSX composition | Complex structural decisions |

**Simple case** (combined):
```
sidebar/
  app-sidebar.tsx    # Both adapter + layout in one file
```

**Complex case** (separated):
```
sidebar/
  app-sidebar.tsx           # Adapter: hooks, passes data
  app-sidebar-layout.tsx    # Layout: pure composition
```

---

## File Structure

```
components/
  # ─── L1: External (immutable) ───
  ui/                          # shadcn/ui
  ai-elements/                 # Vercel AI Elements
  
  # ─── L2: Design System (app-agnostic) ───
  ui-custom/
    primitives/                # Browser/a11y fixes
      textarea.tsx
    sidebar/
      sidebar.tsx              # Sidebar.* compound export
    chat/
      message.tsx              # Message.* compound export
      reasoning.tsx            # Reasoning.* compound export
      chat-input.tsx           # ChatInput.* compound export
    feedback/
      status-block.tsx         # StatusBlock.* compound export
    actions/
      action-list.tsx          # ActionList.* compound export
    user-profile/
      user-profile.tsx         # UserProfile.* compound export
  
  # ─── L3: App Layer (feature folders) ───
  sidebar/
    app-sidebar.tsx            # Feature Root
    app-sidebar-layout.tsx     # Feature Layout (if separated)
    _parts/
      thread-item.tsx          # Feature Part
      user-menu.tsx            # Feature Part
    _hooks/
      use-sidebar-state.ts     # Feature Hook
  
  chat/
    chat-sidebar.tsx           # Simple feature at root
    message/                   # Complex feature subfolder
      message.tsx              # Entry = folder name
      message-user.tsx         # Variant
      message-assistant.tsx    # Variant
      message-layout.tsx       # Layout (if separated)
      _parts/
        reasoning.tsx
        footer.tsx
        status.tsx
      _hooks/
        use-message-actions.ts
    prompt-input/
      prompt-input.tsx         # Entry = folder name
      prompt-input-chat.tsx    # Variant
      _parts/
        attachments.tsx
  
  shared/                      # Cross-feature L3 components
    user-avatar.tsx
    model-badge.tsx
```

---

## Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| Simple Feature Root | `[feature].tsx` or `[parent]-[feature].tsx` | `chat-sidebar.tsx` |
| Complex Feature Entry | `[feature]/[feature].tsx` | `message/message.tsx` |
| Variant | `[feature]/[feature]-[variant].tsx` | `message/message-user.tsx` |
| Feature Layout | `[feature]/[feature]-layout.tsx` | `message/message-layout.tsx` |
| Feature Part | `[feature]/_parts/[part].tsx` | `sidebar/_parts/thread-item.tsx` |
| Feature Hook | `[feature]/_hooks/use-[purpose].ts` | `message/_hooks/use-message-actions.ts` |
| Internal folder | `_[type]/` | `_parts/`, `_hooks/` |

All feature parts and hooks live under `_parts/` and `_hooks/` (no root-level parts or hooks).

### L2 Compound Exports

Always export as namespace object (one per file, no barrel exports):

```tsx
// ui-custom/chat/message.tsx
export const Message = {
  Root: MessageRoot,
  Content: MessageContent,
  Actions: MessageActions,
  Footer: MessageFooter,
};
```

```tsx
// ui-custom/chat/reasoning.tsx
export const Reasoning = {
  Root: ReasoningRoot,
  Trigger: ReasoningTrigger,
  Content: ReasoningContent,
};
```

### L3 Imports

```tsx
// chat/message/message.tsx
import { Message } from "@/components/ui-custom/chat/message";
import { MessageFooter } from "./_parts/footer";  // same feature
import { UserAvatar } from "@/components/shared/user-avatar"; // cross-feature
```

---

## Decision Trees

### Where Does This Component Belong?

```
Does it know about app types? (Thread, User, MyUIMessage, etc.)
│
├─ NO → Does it wrap/style L1 primitives?
│       │
│       ├─ YES → L2: ui-custom/[domain]/
│       └─ NO  → Probably just use L1 directly
│
└─ YES → L3: [feature]/
         │
         ├─ Used by 2+ features? → shared/
         └─ Used by 1 feature?   → [feature]/
```

### Do I Need an L2 Component?

```
Am I just adding className to L1?
├─ YES → Skip L2, compose L1 directly in L3

Am I making styling decisions I'll reuse 2+ times?
├─ YES → Create L2

Am I creating a compound API (Foo.Root, Foo.Content)?
├─ YES → Create L2

Does it need to know app types to work?
├─ YES → Must be L3, not L2
```

### Should I Separate Adapter from Layout?

```
Is the feature simple? (< 50 lines, 1-2 hooks)
├─ YES → Combined in Feature Root

Is the composition complex? (many structural decisions)
├─ YES → Separate Layout

Do I want to test composition without mocking hooks?
├─ YES → Separate Layout

Otherwise → Combined is fine
```

### Where Does This L3 File Go?

```
Is it the main entry point for this feature?
├─ Simple feature → [feature].tsx (Feature Root)
├─ Complex feature → [feature]/[feature].tsx (Entry)

Is it a pure composition separated from hooks?
├─ Simple feature → [feature]-layout.tsx (Feature Layout)
├─ Complex feature → [feature]/[feature]-layout.tsx

Is it a sub-component used only in this feature?
└─ [feature]/_parts/[part].tsx

Is it a hook specific to this feature?
└─ [feature]/_hooks/use-[purpose].ts
```

---

## Real Example: Chat Message Feature

### Requirements
- Display user and assistant messages
- Assistant messages have reasoning (collapsible), content, actions, stats
- User messages are simpler (content, basic actions)
- Actions: copy, retry, fork (with dropdowns)
- Stats: tokens, timing, model
- Error/cancelled states with procedural status blocks

### Layer Breakdown

**L1 (External)**:
- `ai-elements/message` — Base message primitives
- `ai-elements/reasoning` — Reasoning collapse primitives
- `ui/button`, `ui/dropdown-menu` — Action primitives

**L2 (Design System)**:
- `ui-custom/chat/message.tsx` — `Message.*` container + content
- `ui-custom/chat/reasoning.tsx` — `Reasoning.*` collapsible reasoning
- `ui-custom/feedback/status-block.tsx` — `StatusBlock.*` generic status UI
- `ui-custom/actions/action-list.tsx` — `ActionList.*` generic actions UI

Exports generic context interface:
```
MessageContextValue {
  state: { content, reasoning, isStreaming, owner }
  actions: { onCopy, onRetry, onFork }
  meta: { timing, usage, modelId }
}
```

**L3 (App Layer)**: `chat/message/`
```
chat/message/
  message.tsx                   # Entry: routes to User/Assistant
  message-user.tsx              # Variant: user message composition
  message-assistant.tsx         # Variant: assistant message composition
  message-layout.tsx            # Layout (if separated)
  _parts/
    status.tsx                  # L3 adapter: error/cancelled
  _hooks/
    use-message-context.ts      # Maps MyUIMessage → L2 props/context
```

### Data Flow

```
MyUIMessage (app type)
       │
       ▼
use-chat-message-context.ts (L3 hook)
       │
       ▼ transforms to
MessageContextValue (L2 interface)
       │
       ▼ injected into
Message.Provider (L2 context)
       │
       ▼ consumed by
Message.* components (L2 compound)
```

---

## Real Example: Sidebar Feature

### Requirements
- Collapsible sidebar with header, content, footer
- Thread list with context menu (delete, rename)
- User profile menu in footer
- Responsive (sheet on mobile)

### Layer Breakdown

**L2 (Design System)**: `ui-custom/sidebar/sidebar.tsx`
- `Sidebar.Root` — Wraps shadcn sidebar with styling
- `Sidebar.Header` — Logo + actions slot
- `Sidebar.Content` — Scrollable list area
- `Sidebar.Item` — Generic item (icon, label, active state)
- `Sidebar.Footer` — Bottom slot
- `Sidebar.Trigger` — Mobile toggle

**L3 (App Layer)**: `sidebar/`
```
sidebar/
  app-sidebar.tsx              # Feature Root: hooks + composition
  _parts/
    thread-item.tsx            # Feature Part: knows Thread type
    user-menu.tsx              # Feature Part: knows User type
```

### Why SidebarThreadItem is L3

It knows app concepts:
- `Thread` type (id, title, createdAt)
- `useThreadActions()` hook (delete, rename)
- `useIsActiveThread()` hook

But it composes L2 primitives:
- `Sidebar.Item` for visual structure
- `ContextMenu` from L1 for interactions

---

## Migration Strategy

### When Touching Existing Code

1. **Small change, messy file**: Make your change, leave a `// TODO: migrate to L2/L3 pattern` comment
2. **Medium change**: Refactor the specific component you're touching
3. **Large change / new feature**: Follow this guide fully

### Identifying Old Patterns

| Old Pattern | Problem | New Pattern |
|-------------|---------|-------------|
| App hooks in `ui-custom/` | L2 has app dependency | Move to L3, keep L2 pure |
| Flat files in `components/` | No feature grouping | Create feature folders |
| Boolean prop explosion | Unmaintainable variants | Explicit variant components |
| Single monolith component | Mixed concerns | Compound components + adapters |
| Imports from multiple `ui-custom/` subfolders in one component | Sign of unclear boundaries | Re-evaluate layer placement |

### Progressive Migration Checklist

When refactoring a component:

- [ ] Identify which layer it should be (L2 or L3)
- [ ] If L2: remove all app hooks and app type imports (L1 types OK)
- [ ] If L3: move to feature folder, create compound L2 if reusable
- [ ] Export L2 as namespace object (`Component.*`)
- [ ] L3 adapter maps app types → L2 props/context
- [ ] Update imports in consuming files

---

## Quick Reference

### The Golden Rules

1. **L1 is immutable** — Never edit `ui/` or `ai-elements/`
2. **L2 is app-agnostic** — No app hooks/types; L1 types OK
3. **L3 is app-aware** — Hooks, app types, composition decisions
4. **Compound over boolean** — `Message.User` not `<Message isUser />`
5. **Explicit variants** — `ChatMessageAssistant` not `<ChatMessage role="assistant" />`
6. **Adapter pattern** — L3 maps app types → L2 interfaces

### Import Rules

```tsx
// L2 can import:
import { Button } from "@/components/ui/button";           // L1 ✓
import { Reasoning } from "@/components/ai-elements/..."; // L1 ✓
import { cn } from "@/lib/utils";                         // utils ✓
import type { UIMessage, FileUIPart } from "ai";          // L1 type ✓

// L2 MUST define its own interfaces:
interface MessageContextValue {
  content: string;
  isStreaming: boolean;
}

// L2 CANNOT import:
import { useChat } from "@/hooks/use-chat";               // app hook ✗
import type { MyUIMessage } from "@/types";               // app type ✗
import { SomeComponent } from "@/components/chat/...";    // L3 ✗

// L3 can import:
import { Message } from "@/components/ui-custom/chat/message"; // L2 ✓
import { useChat } from "@/hooks/use-chat";                    // app hook ✓
import type { MyUIMessage } from "@/types";                    // app type ✓
import { SidebarThreadItem } from "./_parts/thread-item";      // same feature ✓
import { UserAvatar } from "@/components/shared/user-avatar";  // shared L3 ✓
```

---

## Summary Table

| Aspect | L1 External | L2 Design System | L3 App Layer |
|--------|-------------|------------------|--------------|
| **Location** | `ui/`, `ai-elements/` | `ui-custom/[domain]/` | `[feature]/`, `shared/` |
| **Mutability** | Immutable | Owned, app-agnostic | Owned, app-specific |
| **App hooks** | N/A | NO | YES |
| **App types** | N/A | NO | YES |
| **Exports** | As installed | Namespace object | Named exports |
| **Styling** | As installed | Embedded decisions | Minimal, uses L2 |
| **Examples** | `Button`, `Dialog` | `Message.*`, `Sidebar.*` | `ChatMessage`, `AppSidebar` |
