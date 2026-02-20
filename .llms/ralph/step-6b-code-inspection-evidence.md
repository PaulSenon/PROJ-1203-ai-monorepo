# Step 6b - Code Inspection Evidence (TanStack Virtual Rewrite)

PRD reference: `.llms/ralph/prd.md`

## Task completed

- Validate code-inspection-only acceptance criteria: AC3, AC4, AC7.

## Evidence

### AC3 - Fake sidebar virtualization path removed

- `apps/web/src/components/ui-custom/sidebar/sidebar.tsx:163` uses one real `useVirtualizer` path.
- `apps/web/src/components/ui-custom/sidebar/sidebar.tsx:214` renders rows from `virtualRows` only.
- No alternate non-virtual list render path exists in sidebar adapter file.

Status: PASS (code inspection)

### AC4 - No virtualization fallback/toggle path

- Sidebar path is unconditional: `Sidebar` always renders `SidebarThreads` (`apps/web/src/components/ui-custom/sidebar/sidebar.tsx:113`).
- Conversation path is unconditional: `ChatConversationLayout` always renders `ConversationMessagesList` (`apps/web/src/components/chat/conversation/conversation-layout.tsx:33`).
- `ConversationMessagesList` always instantiates `useWindowVirtualizer` (`apps/web/src/components/chat/conversation/_parts/messages-list.tsx:34`).
- `SidebarThreads` always instantiates `useVirtualizer` (`apps/web/src/components/ui-custom/sidebar/sidebar.tsx:163`).
- No runtime/env feature flag branch found for enabling/disabling virtualization in these adapters.

Status: PASS (code inspection)

### AC7 - `onLoadOlder` API slot exists and remains unwired

- Slot exists in conversation layout props: `apps/web/src/components/chat/conversation/conversation-layout.tsx:14`.
- Slot is passed through to conversation adapter: `apps/web/src/components/chat/conversation/conversation-layout.tsx:35`.
- Adapter prop exists in list surface: `apps/web/src/components/chat/conversation/_parts/messages-list.tsx:14`.
- Current caller does not wire it yet: `apps/web/src/components/chat/conversation/conversation.tsx:19` (no `onLoadOlder` prop provided).

Status: PASS (code inspection)

## Notes for next iteration

- Remaining Step 6 runtime matrix still needed (desktop + mobile) for AC1/AC2/AC5/AC6/AC8.
- INP p75 evidence still needed for go/no-go against AC8.
