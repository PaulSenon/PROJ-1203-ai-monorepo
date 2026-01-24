## Problem Statement

Current stream delta query re-sends full history on each new chunk, causing egress + cache churn. Multi-stream-per-thread model forces paginated messages + per-message stream lookup + per-stream delta reconstruction. Client streaming hook returns list of streams; now moving to single stream per thread, so contract mismatch and complexity.

## Solution

Move to single stream per thread and a cursor-based tail query. Client uses one reactive query that returns history on first run (cursor=0), then only new deltas as cursor advances. Replace current streaming hook to accumulate deltas for a single stream and reconstruct one UIMessage, keeping existing UIMessage reconstruction logic.

## User Stories

1. As a chat user, I want streaming responses to update smoothly, so that UI feels real-time.
2. As a chat user, I want reconnect/resume to show the current partial response, so that I can continue reading.
3. As a developer, I want one stream per thread, so that data model stays simple.
4. As a developer, I want a single stream query roundtrip, so that client logic is minimal.
5. As a developer, I want deltas fetched incrementally, so that egress stays low.
6. As a developer, I want cursor auto-advance, so that no manual pagination.
7. As a developer, I want stream reset on new streamId, so that stale deltas are not merged.
8. As a developer, I want to avoid cached useQuery helpers, so that old cursors don’t keep live subscriptions.
9. As a developer, I want UIMessage reconstruction unchanged, so that rendering stays consistent.
10. As a developer, I want the hook to accept threadId or skip, so that usage is consistent with existing hooks.

## Implementation Decisions

- Data model: single stream per thread, lookup by userId+threadId; remove messageId from stream record; unique index on userId+threadId.
- Query contract: input threadId + cursor (default 0). Output null if no stream; else streamId + deltas.
- Delta query: filter start >= cursor, order asc, limit 100 per response. Single query, no list query roundtrip.
- Cursor: client advances to last delta end; args change re-subscribes query; payload stays small.
- Reset: if streamId changes, clear deltas + cursor and rebuild.
- Client hook: use convex/react useQuery only; no cached useQuery helpers.
- UI: streaming hook returns single UIMessage (not list), merged as before in unified messages logic.
- Performance: avoid full-history resends; limit reduces burst on long catch-up.
- Cursor source: client-derived from deltas; no server-returned cursor to avoid extra reactive churn.
- Hook perf: use refs for deltas/cursor/streamId to avoid array deps and reduce rerenders.

## Testing Decisions

- Good tests assert external behavior only: correct deltas, correct cursor advance, reset on new stream, no dupes.
- Server query tests: null when no stream, only start>=cursor, respects limit.
- Client hook tests: first call returns history, subsequent updates append tail only, reset on streamId change, skip mode.
- Prior art: Convex Agent streaming hooks (cursor-based delta sync).

## Out of Scope

- AI SDK resumable streams.
- HTTP streaming endpoint changes.
- Multi-stream per thread.
- Schema changes unrelated to stream/thread relation.

## Further Notes

Rationale

- Convex queries re-send full results on invalidation; cursor-based tail keeps results small.
- Single stream per thread removes per-message stream lookup complexity.

References

- Convex Agent streaming pattern: cursor-based deltas + client accumulation.
- Convex streaming docs on deltas and sync.

Minimal query (server)

```ts
export const listThreadStreamDeltas = query({
  args: { threadId: v.id("threads"), cursor: v.optional(v.number()) },
  handler: async (ctx, { threadId, cursor = 0 }) => {
    const stream = await ctx.db
      .query("messageStreams")
      .withIndex("byUserIdThreadId", (q) => q.eq("threadId", threadId))
      .unique();
    if (!stream) return null;

    const deltas = await ctx.db
      .query("streamDeltas")
      .withIndex("byStreamIdStartEnd", (q) =>
        q.eq("streamId", stream._id).gte("start", cursor),
      )
      .order("asc")
      .take(100);

    return { threadId, streamId: stream._id, deltas };
  },
});
```

Minimal hook (client, perf-friendly)

```tsx
export function useThreadStreamDeltas(threadId: string | "skip") {
  const isSkip = threadId === "skip";
  const [cursor, setCursor] = useState(0);
  const [allDeltas, setAllDeltas] = useState<StreamDelta[]>([]);
  const streamIdRef = useRef<string | null>(null);
  const deltasRef = useRef<StreamDelta[]>([]);
  const cursorRef = useRef(0);
  const seenRef = useRef(new Set<string>());

  const result = useQuery(
    api.streams.listThreadStreamDeltas,
    isSkip ? "skip" : { threadId, cursor },
  ) as StreamQueryResult | undefined;

  useEffect(() => {
    if (!result) return;

    if (result.streamId !== streamIdRef.current) {
      streamIdRef.current = result.streamId;
      deltasRef.current = [];
      cursorRef.current = 0;
      seenRef.current.clear();
      setAllDeltas([]);
      setCursor(0);
    }

    if (!result.deltas.length) return;

    let changed = false;
    let nextCursor = cursorRef.current;
    const next = [...deltasRef.current];

    for (const d of result.deltas) {
      if (seenRef.current.has(d._id)) continue;
      seenRef.current.add(d._id);
      next.push(d);
      changed = true;
      if (d.end > nextCursor) nextCursor = d.end;
    }

    if (changed) {
      deltasRef.current = next;
      setAllDeltas(next);
    }
    if (nextCursor !== cursorRef.current) {
      cursorRef.current = nextCursor;
      setCursor(nextCursor);
    }
  }, [result]);

  return allDeltas;
}
```

Client integration note

- Replace current paginated streaming hook to consume single-stream deltas and reconstruct a single UIMessage; keep existing UIMessage reconstruction helper.
- Avoid cached query helpers in streaming path; use convex/react useQuery directly.
