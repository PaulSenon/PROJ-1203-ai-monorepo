# Current State of Message UI

The current message UI is messy with 2 incomplete iterations that haven't been properly merged or cleaned up.

## First Iteration

Location: `apps/web/src/components/chat/chat-messages/*.tsx`

Goal was basic ai-elements/message usage. Added on top:
- Procedural error component (WIP, not following final specs in 1-ui-requirements.md)
- Custom smooth stream text handling (to smooth out chunked streaming)

## Second Iteration

UI-focused iteration, mainly vibe-coded without following the 3-layer architecture:

- `apps/web/src/components/chat/chat-message.tsx`
- `apps/web/src/components/chat/chat-message-status.tsx`
- `apps/web/src/components/ui-custom/chat/**/*.tsx` (messy: message-action.tsx, message-actions.tsx, message-info.tsx, message-infos.tsx)

Problems:
- Guided initial structure then vibe-coded the rest
- Didn't implement all features from first iteration (like error messages)
- Some second iteration parts depend on first iteration code
- Absolute mess that needs refactoring

## Refactoring Approach

Don't take example from existing code. Instead:
- Know what existed in each iteration
- Deduce final base design (2nd iteration design is almost right, just lacks customization and clean composable shadcn-like components)
- Reuse ai-elements primitives where possible

## Test Page

Location: `apps/web/src/routes/components/_components/messages.tsx`

Current state:
- Broken (not responsive, crops on mobile, weird zoom behavior)
- Poorly architected with dead code
- Vibe-coded

Desired:
- Keep the concept of a component UI test page for quick iteration and debug
- Rebuild properly as a single component with all states and live parameter controls
