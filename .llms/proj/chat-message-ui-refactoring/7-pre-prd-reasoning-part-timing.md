# Pre‑PRD: Reasoning Part Timing Metadata

## Problem

Reasoning UI wants “Thought for Xs” per reasoning block. AI SDK UIMessage parts do not support arbitrary per‑part metadata. Current backend only emits message‑level metadata. Result: no reliable per‑reasoning duration.

## Proposed Direction

Add per‑reasoning timing metadata via custom `data-*` UIMessage parts or via message metadata keyed by part id.

Option A: `data-*` part

- Emit a `data-reasoning-timing` part with `{ partId, startMs, endMs }`
- Append right after each `reasoning-end`

Option B: message metadata map

- Store `{ [partId]: { startMs, endMs } }` in message metadata
- Requires message metadata update on reasoning end

## Likely Touchpoints

- `packages/api/src/handlers/chat.handler.ts`
- AI SDK stream: hook reasoning start/end events

## Open Questions

- Preferred storage: data part vs metadata map?
- Which id to use as `partId` (index, generated id, stable hash)?
- Backfill for existing messages?

## References

- UIMessage parts do not allow arbitrary metadata; use data parts: https://github.com/vercel/ai/blob/main/content/docs/07-reference/01-ai-sdk-core/31-ui-message.mdx
- Message metadata hook: https://ai-sdk.dev/docs/ai-sdk-ui/message-metadata
