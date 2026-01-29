# Desired Component Code Architecture

The current component architecture is messy and not properly documented or implemented.

## The 3-Layer Model

See `apps/web/src/components/README.md` for the full guide with decision trees and examples.

### L1: External (Immutable)

Location: `components/ui/`, `components/ai-elements/`

External shadcn registries. Immutable so we can easily update without conflicts.
- shadcn/ui
- vercel/ai-elements

### L2: Design System (App-Agnostic)

Location: `components/ui-custom/[domain]/`

Compound component sets that embed design decisions but know nothing about app domain.
- No app hooks, no app types
- Exports namespace objects: `Message.*`, `ChatInput.*`
- May have internal context for compound component state

Good examples in this project:
- `apps/web/src/components/ui-custom/chat/chat-input.tsx`
- `apps/web/src/components/ui-custom/chat/model-selector.tsx`

These correctly compose from ai-elements (L1), embed design choices, and expose a simple composable API.

### L3: App Layer (Feature-Specific)

Location: `components/[feature]/`, `components/shared/`

Binds L2 components to app state. The simpler the L2 API, the more readable the L3 binding.

Good examples:
- `apps/web/src/components/chat/chat-input/chat-input.tsx`
- `apps/web/src/components/chat/chat-input/chat-model-selector.tsx`

## Compound Component Pattern

Define all composable sub-components in the same file, export under a single namespace:

```tsx
// L2: ui-custom/chat/chat-input.tsx
export const ChatInput = {
  Root: ChatInputRoot,
  Body: ChatInputBody,
  Textarea: ChatInputTextarea,
};
```

```tsx
// L3: chat/chat-input.tsx
import { ChatInput as Input } from "@/components/ui-custom/chat/chat-input";

export function ChatInput() {
  const actions = useChatActions();
  
  return (
    <Input.Root onSubmit={actions.submit}>
      <Input.Body>
        <Input.Textarea />
      </Input.Body>
    </Input.Root>
  );
}
```

## Anti-Pattern: Scattered Primitives

Previous attempts scattered sub-components into individual "primitive" files. Problems:
- Not actually primitives (confusion with browser/a11y fixes)
- Hard to maintain and compose
- Requires either re-exporting from main file or importing from many places in L3

## Performance Requirements

Every component must be engineered for:
- Simplicity (DX)
- Super performance with customization freedom
- Handling thousands of instances in complex layouts
- Memoization, rerender optimization, layout painting optimization

## Message Component Goal

Craft the Message component following the ChatInput pattern:
- L2 compound component in `ui-custom/chat/message.tsx`
- L3 adapter in `chat/chat-message.tsx`
- Reuse ai-elements primitives where possible (unless requiring too many hacks)
