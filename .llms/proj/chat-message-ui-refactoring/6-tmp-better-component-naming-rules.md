# The Naming Ambiguity Problem — Real & Needs Solving

> _Note: this file is NOT a specification file. Naming and file structure and implementation are just examples to describe the more global composition intention._

## The problem: `chat-prompt-input.tsx` is ambiguous

- Entry for `prompt-input` feature?
- `input` variant of `chat-prompt`?
- `input` part of `chat-prompt`?

## Proposed solution: Sub-folders for complex features (example)

```text
chat/
├── chat-sidebar.tsx         # Simple feature at root
├── message/                 # Complex feature subfolder
│   ├── message.tsx              # Entry: same as folder
│   ├── message-user.tsx         # Variant: [folder]-[variant].tsx
│   ├── message-assistant.tsx    # Variant
│   ├── _parts/
│   │   ├── reasoning.tsx        # Part (no prefix needed)
│   │   ├── footer.tsx
│   │   └── status.tsx           # L3 adapter for StatusBlock L2
│   └── _hooks/
│       └── use-message-actions.ts
├── prompt-input/
│   ├── prompt-input.tsx         # Entry
│   ├── prompt-input-chat.tsx    # Variant
│   ├── prompt-input-search.tsx  # Variant
│   └── _parts/
│       └── attachments.tsx
```

## Rules

1. Entry = `[folder-name].tsx` — always, no ambiguity
2. Variants = `[folder-name]-[variant].tsx` — at folder root
3. Parts = in `\_parts/` folder — no prefix needed inside
4. Hooks = in `\_hooks/` folder

Now you can instantly know

- `message/message.tsx` → entry
- `message/message-user.tsx` → variant
- `message/\_parts/footer.tsx` → part

## L2 Structure (example)

```text
ui-custom/
├── chat/
│   ├── message.tsx          # Message.* compound (wraps ai-elements)
│   └── reasoning.tsx        # Reasoning.* compound
├── feedback/
│   └── status-block.tsx     # StatusBlock.* compound (generic!)
├── common/
│   └── responsive-list.tsx  # ResponsiveList.* compound (generic!)
# OR maybe domain-split:
├── actions/
│   └── action-bar.tsx       # ActionBar.* (for action buttons)
└── stats/
    └── stat-bar.tsx         # StatBar.* (for stat labels)
```

Key insight: domain ≠ feature. L2 is organized by domain (what kind of UI concern), not feature (what app feature uses it).
