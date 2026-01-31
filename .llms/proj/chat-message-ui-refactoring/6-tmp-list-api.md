# TMP: ResponsiveList Requirements — Consolidated

> _Note: this file is NOT a specification file. Naming and file structure and implementation are just examples to describe the more global composition intention._

## ResponsiveList Requirements

### Core Concept

A generic L2 component that handles:

1. 3-tier visibility — items declare which tier they belong to
2. Overflow management — secondary items collapse to "more" menu based on viewport
3. Nested menus — sub-items render as nested menus in both visible and collapsed states
4. Custom rendering — delegates all visual rendering to provided functions

### 3-Tier Visibility System

| Tier      | Behavior                                             |
| --------- | ---------------------------------------------------- |
| primary   | Always visible (mobile & desktop)                    |
| secondary | Visible if viewport allows, otherwise in "more" menu |
| tertiary  | Always in "more" menu                                |

No maxVisible prop — visibility is determined by:

1. Item's declared tier
2. Viewport size (media query for secondary items)

## Item Configuration

```tsx
interface ListItem<TData = unknown> {
  id: string;
  tier: "primary" | "secondary" | "tertiary";

  // Display data (opaque - rendering decides how to use)
  icon?: ReactNode;
  label: string;
  tooltip?: ReactNode;

  // Custom data for rendering (e.g., action callbacks, stat values)
  data: TData;

  // Sub-items configuration
  subItems?: ListItem<TData>[];
  subItemsTrigger: "click" | "context"; // when sub-items menu shows
  // click = default click shows submenu (like Share, Retry)
  // context = right-click shows submenu (like Copy with variants)
}
```

## Trigger Behaviors

Each item can have two triggers:

- Primary trigger — the default interaction (click for actions, hover for stats)
- Secondary trigger — alternative interaction (typically context menu)

  | Use Case                         | Primary Trigger  | Secondary Trigger                 |
  | -------------------------------- | ---------------- | --------------------------------- |
  | Action button (simple)           | click → callback | context → nothing                 |
  | Action button (with sub-actions) | click → callback | context → submenu                 |
  | Action button (menu-first)       | click → submenu  | context → nothing                 |
  | Stat label                       | hover → tooltip  | click → tooltip (mobile fallback) |

## Real-World Examples

### 1. Copy Action

```tsx
{
  id: 'copy',
  tier: 'primary',
  icon: <CopyIcon />,
  label: 'Copy',
  tooltip: 'Copy to clipboard',
  data: { onCopy: () => copyToClipboard(content) },
  subItems: [
    { id: 'copy-md', label: 'Copy as Markdown', data: { onCopy: () => copyAsMarkdown() } },
    { id: 'copy-raw', label: 'Copy as plain text', data: { onCopy: () => copyAsText() } },
  ],
  subItemsTrigger: 'context', // right-click shows sub-actions
}
```

### 2. Share Action

```tsx
{
  id: 'share',
  tier: 'secondary',
  icon: <ShareIcon />,
  label: 'Share',
  tooltip: 'Share or export',
  data: {},
  subItems: [
    { id: 'share-url', label: 'Copy link', data: { onShare: () => copyUrl() } },
    { id: 'export-pdf', label: 'Export as PDF', data: { onShare: () => exportPdf() } },
    { id: 'export-md', label: 'Export as Markdown', data: { onShare: () => exportMd() } },
  ],
  subItemsTrigger: 'click', // click shows share menu
}
```

### 3. Retry Action (Custom L3 Component)

```tsx
{
  id: 'retry',
  tier: 'secondary',
  icon: <RefreshIcon />,
  label: 'Retry',
  tooltip: 'Retry with different model',
  data: {
    currentModel: 'gpt-4',
    onRetry: (modelId: string) => retryWithModel(modelId),
    // L3 will render a model picker, not a simple submenu
    customComponent: true, // signal to use custom rendering
  },
  subItemsTrigger: 'click',
}
```

### 4. Stat: Tokens/sec

```tsx
{
  id: 'speed',
  tier: 'primary',
  icon: <ZapIcon />,
  label: '45 tok/s',
  tooltip: <RichTooltip>Average generation speed</RichTooltip>,
  data: { value: 45, unit: 'tok/s' },
  subItems: [], // no sub-items
  subItemsTrigger: 'click', // irrelevant since no sub-items
}
```

### 5. Stat: Model ID

```tsx
{
  id: 'model',
  tier: 'secondary',
  icon: <CpuIcon />,
  label: 'GPT-4o',
  tooltip: <ModelInfoTooltip model={model} />,
  data: { modelId: 'gpt-4o' },
  subItems: [],
  subItemsTrigger: 'click',
}
```

## Rendering Configuration

```tsx
interface ResponsiveListProps<TData> {
  items: ListItem<TData>[];

  // ═══════════════════════════════════════════════════════
  // VISIBLE ITEM RENDERING
  // ═══════════════════════════════════════════════════════
  renderItem: (
    item: ListItem<TData>,
    handlers: {
      onPrimaryTrigger: () => void; // call this on primary action
      onSecondaryTrigger: () => void; // call this on secondary action
      openSubMenu: () => void; // manually open sub-menu
    },
  ) => ReactNode;

  // ═══════════════════════════════════════════════════════
  // "MORE" MENU RENDERING
  // ═══════════════════════════════════════════════════════
  renderMoreTrigger: (props: {
    overflowCount: number;
    isOpen: boolean;
    toggle: () => void;
  }) => ReactNode;

  renderMenuItem: (
    item: ListItem<TData>,
    handlers: {
      onTrigger: () => void; // menu item click
      hasSubItems: boolean; // show chevron?
    },
  ) => ReactNode;

  // ═══════════════════════════════════════════════════════
  // SUB-MENU RENDERING (for nested menus)
  // ═══════════════════════════════════════════════════════
  renderSubMenuItem: (
    subItem: ListItem<TData>,
    handlers: {
      onTrigger: () => void;
    },
  ) => ReactNode;

  // ═══════════════════════════════════════════════════════
  // BEHAVIOR CONFIG
  // ═══════════════════════════════════════════════════════
  primaryTriggerType?: "click" | "hover"; // default: 'click'
  // 'click' = actions behavior
  // 'hover' = stats behavior (with click fallback on mobile)
}
```

## What ResponsiveList Handles Internally

1. Visibility calculation — which items are visible vs collapsed
2. Viewport detection — media queries for secondary tier
3. Overflow menu state — open/close, positioning
4. Sub-menu orchestration — when to show nested menus
5. Mobile detection — fallback behaviors (hover → click)
6. Keyboard navigation — a11y for menus

## What ResponsiveList Does NOT Handle

1. Visual styling of items (delegated to render functions)
2. Business logic callbacks (provided in item.data)
3. Custom components (L3 decides when to render custom vs standard)

---

## Example Usage

```tsx
// L2: ResponsiveList (ui-custom/lists/responsive-list.tsx)
// The generic L2 - handles visibility, overflow, menus
export const ResponsiveList = {
  Root: ResponsiveListRoot,
  // Internal use only - not exported for composition
};
// Usage is via a single Root with render props
<ResponsiveList.Root
  items={items}
  primaryTriggerType="click"
  renderItem={(item, { onPrimaryTrigger, onSecondaryTrigger }) => (
  // L3 decides what to render
  )}
  renderMoreTrigger={({ overflowCount, toggle }) => (
  // L3 decides what "more" looks like
  )}
  renderMenuItem={(item, { onTrigger, hasSubItems }) => (
  // L3 decides menu item appearance
  )}
  renderSubMenuItem={(subItem, { onTrigger }) => (
  // L3 decides sub-menu item appearance
  )}
/>
```

```tsx
// L3: MessageActionsBar (chat/message/\_parts/actions-bar.tsx)
export function MessageActionsBar({ message }: { message: MyUIMessage }) {
  const actions = useMessageActions(message); // builds ListItem<ActionData>[]

  return (
    <ResponsiveList.Root
      items={actions}
      primaryTriggerType="click"
      renderItem={(item, { onPrimaryTrigger, onSecondaryTrigger }) => {
        // Special case: custom component (like retry with model picker)
        if (item.data.customComponent) {
          return <item.data.customComponent item={item} />;
        }

        // Standard action button
        return (
          <ActionButton
            icon={item.icon}
            tooltip={item.tooltip}
            onClick={onPrimaryTrigger}
            onContextMenu={(e) => {
              e.preventDefault();
              onSecondaryTrigger();
            }}
          />
        );
      }}
      renderMoreTrigger={({ overflowCount, toggle }) => (
        <Button variant="ghost" size="icon-sm" onClick={toggle}>
          <MoreHorizontalIcon />
          <span className="sr-only">{overflowCount} more actions</span>
        </Button>
      )}
      renderMenuItem={(item, { onTrigger, hasSubItems }) => (
        <DropdownMenuItem onClick={onTrigger}>
          {item.icon}
          <span>{item.label}</span>
          {hasSubItems && <ChevronRightIcon />}
        </DropdownMenuItem>
      )}
      renderSubMenuItem={(subItem, { onTrigger }) => (
        <DropdownMenuItem onClick={onTrigger}>
          {subItem.icon}
          <span>{subItem.label}</span>
        </DropdownMenuItem>
      )}
    />
  );
}
```

```tsx
// L3: MessageStatsBar (chat/message/\_parts/stats-bar.tsx)
export function MessageStatsBar({ message }: { message: MyUIMessage }) {
  const stats = useMessageStats(message); // builds ListItem<StatData>[]

  return (
    <ResponsiveList.Root
      items={stats}
      primaryTriggerType="hover" // ← key difference from actions
      renderItem={(item, { onPrimaryTrigger }) => (
        <StatLabel
          icon={item.icon}
          value={item.label}
          tooltip={item.tooltip}
          onHover={onPrimaryTrigger} // desktop: hover shows tooltip
          onClick={onPrimaryTrigger} // mobile: tap shows tooltip
        />
      )}
      renderMoreTrigger={({ overflowCount, isOpen, toggle }) => (
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggle}
            onMouseEnter={toggle} // hover on desktop
          >
            <InfoIcon className="size-3.5" />
          </Button>
        </TooltipTrigger>
      )}
      renderMenuItem={(item, { onTrigger }) => (
        // Stats in "more" menu are just info rows
        <div className="flex items-center gap-2 px-2 py-1">
          {item.icon}
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      )}
      renderSubMenuItem={() => null} // stats don't have sub-items
    />
  );
}
```

---

## Key Design Decisions

| Decision                         | Rationale                                                      |
| -------------------------------- | -------------------------------------------------------------- |
| Generic TData                    | Actions need callbacks, stats need values — both are just data |
| Render functions over slots      | Maximum flexibility, L2 doesn't dictate appearance             |
| subItemsTrigger per item         | Copy uses context, Share uses click — varies per item          |
| primaryTriggerType per list      | Actions = click, Stats = hover — consistent within list        |
| customComponent escape hatch     | Retry/Fork need model picker UI — too complex for config       |
| No separate ActionBar/StatBar L2 | Same core logic, different render functions                    |
