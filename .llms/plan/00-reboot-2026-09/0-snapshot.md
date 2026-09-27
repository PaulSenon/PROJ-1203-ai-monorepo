# Snapshot — state of the project when paused

As of 2026-09-27. Last code touch 2026-05-03 ~01:00 (uncommitted v4 store files).

## Git state

- `main` = `ece1a2c` (2026-02-09). **Frozen since Feb 9.** All real work since lives on feature branches.
- Last coherent commit: `6b926f0` (2026-04-23) "update legendlist and add skills" = `feat/legendlist-v2` = `feat/messages-store-v4` HEAD. 73 commits ahead of main. Includes PR #11 "sunny tiger" (providers revamp, activity pool, app-ready coordinator, local-first assistant ids, vitest, chat-nav rewrite).
- Working tree on `feat/messages-store-v4` (uncommitted):
  - new `apps/web/src/hooks/chat/messages/**` (v4 zustand store skeleton, **does not compile**)
  - `apps/web/src/hooks/use-messages.tsx` edited (removed `normalizeMessages` + `withDataSource`) — **introduces a bug**, see below
  - `zustand` added to web deps, t3code submodule added, skill `transitions-dev`, git-reference bumps
  - untracked `.env.enc` (not referenced anywhere — probably your secrets backup; keep it safe, never commit)
  - untracked `.llms/plan/app-ready/` (already implemented in #11; docs only)
- Stash: `stash@{0}` on `feat/tanstack-virtual` ("claude migration to virtua").
- Worktrees: 4 prunable opencode (container paths) + 11 Cursor ones from Nov–Dec 2025.
- `packages/tmp` = rivet agent-os experiment (unrelated, removable).
- `streamdown` dep = `file:/app/.tmp/streamdown-2.3.0.tgz` (patched local tarball, container path).
- Dev env runs in Docker (`make dev`, `make run cmd=…`); `/app` = repo inside container.

## The messages-store saga (5 attempts, same problem)

Problem: streaming UI re-renders too much because merging 5 sources (cache, persisted paginated, optimistic, resumed convex stream, http AI SDK stream) produces new object refs for unchanged messages, and the whole `messages[]` flows through context → list → rows → markdown.

Concrete churn sources in HEAD code:
1. each hot tick rebuilds whole `messages[]` (`use-messages.tsx:407`) → LegendList `data` changes → `renderItem` for all visible rows
2. cache→persisted / http→persisted / optimistic→persisted handoffs create equal-but-new objects → full row + markdown rerender
3. resumed stream rebuilds the full message from all chunks each tick (`use-messages.tsx:204`)
4. `regenerate` depends on `messages` (`use-chat-active.tsx:429`) → **actions context changes every tick** → PromptInput rerenders while streaming
5. `cache.set(messages.slice(-10))` every tick (`use-messages.tsx:436`)
6. `ChatMessageAssistant` reads the whole message → metadata churn wakes markdown

| # | branch | dates | store | outcome |
|---|---|---|---|---|
| 1 | `opencode/gentle-river` | Mar 7–8 | none | stabilization pass after merge; not merged |
| 2 | `feat/messages-stability` | Apr 11 | none | pure assembly core + ref reuse + tests; "accepted" but **never merged** |
| 3 | `feat/messages-perf-v2` | Apr 14–17 | Legend-State | ids-first store + projector + validator; worked but Legend typing got weird |
| 4 | `feat/messages-v3` | Apr 18–23 | zustand/vanilla | runtime/reconciler/view-store; tests green, never QA'd; "vibe coded" |
| 5 | working tree (v4) | May 3 | zustand/vanilla | layers-in-store + base/hot/final projections + headless source components; skeleton only |

All 5 converge on the same architecture → see `3-messages-architecture.md`.

## v4 status (for when the track resumes)

Done: `message-core/*` (layers, projections), `message-store/*` (store, scheduler, hooks, provider).
Missing:
- 4 source files empty; `message-sources.tsx:1-4` imports non-existent names
- stabilization (`reusePartsRef` in `message-utils.ts:33` is a no-op stub) — **the actual heart**
- trim rules (persisted pending tail during resume, cache overlap)
- sync cache seed, provider mount, UI wiring
Design issues:
- store created in `useMemo`, disposed in effect cleanup (`message-store-provider.tsx:33/42`) → `<Activity>` hide/show leaves a dead store
- two store writes per publish (`create-projection-scheduler.tsx:78` then `:57`)
- `getMessageOrderKey` falls back to `Date.now()` → unstable order (legacy too)
- `orderedIds` rebuilt when hot adds/hides ids (`message-projection.ts:157`)

## ⚠️ Live bug in working tree

`apps/web/src/hooks/use-messages.tsx:310` — `persistedLayerRaw.slice(0, -1);` lost its `return`. Refresh mid-stream → empty persisted assistant shell overrides cached streaming text. Only exists in the uncommitted diff; `6b926f0` is fine.

## Known pre-existing issues (as of April)

- `pnpm run check-types` blocked in `apps/server` by TS6305 (api-service dist build order) — maybe fixed since, verify
- LegendList: `onLoad` safety net removed with beta 47 (TODO pending), suspected Safari `getItemType` bug, big message shifts content
- logged-out state broken, draft broken, multi-google-account login broken (TODO.md)
