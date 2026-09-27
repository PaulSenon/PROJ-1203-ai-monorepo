# Reboot plan

## The call (and why)

1. **Base = `6b926f0`, not literal `main`.** `main` (Feb 9) is missing 73 commits of real, working progress: PR #11 (providers/scopes revamp, activity pool, app-ready coordinator, local-first assistant ids, vitest), the streamdown upgrade, worker code highlighting, sidebar refactor + LegendList sidebar, the paginated-query reactivity fix. Resetting to Feb 9 would mean redoing all of that. `6b926f0` is the last coherent commit (right before the v4 WIP). We upgrade *that*, then make it `main`.
2. **Upgrade before finishing v4.** v4 is ~20% built (skeleton, no sources, no stabilization, not wired). Its inputs are exactly what upgrades may change (AI SDK `UIMessage`/`useChat`, LegendList API, streamdown). Two moving targets at once = the burnout loop again.
3. **Don't redesign the messages store from zero either.** The decisions (ids-first list, per-slice subscriptions, append-only parts invariant, single writer) are library-agnostic and were reached independently 5 times. After upgrading: re-research (t3code, LegendList stable, AI SDK), run *one* short grill to confirm/adjust, then rebuild v4 on the new base, reusing its core files.
4. **Messages store before virtualization.** Every LegendList edge case so far was confounded by re-render churn. Calm data layer first, then pick/tune the virtualizer with a clean signal.
5. **One family of changes per commit, baseline before and after.** You can't tell if an upgrade broke something unless you know what worked before.

---

## Phase 0 — Preserve (≈1 hour, you run these)

Nothing here changes behavior. It makes deletion/cleanup safe later.

- [x] Commit v4 WIP as-is on its branch, **excluding the reboot docs + memory edits** (they must travel to the new base instead):
  ```sh
  git add -A -- . ':!.llms/plan/00-reboot-2026-09' ':!.llms/memory'
  git commit -m "wip(v4): messages store skeleton — does not compile"
  ```
  (includes the `use-messages.tsx:310` bug; it's reference only now). Untracked reboot docs + modified memory files then follow you when you `git switch -c chore/reboot 6b926f0` (if git refuses due to memory conflicts: `git stash push .llms/memory` → switch → `git stash pop`).
- [x] Create the reboot branch now (you can't delete the branch you're standing on): `git switch -c chore/reboot 6b926f0`
- [x] Tag + delete branches per `4-branch-triage.md` (done 2026-09-27, see execution log there; 6 remote branches kept because of open PRs #8–#13, 2 local ones locked by Cursor worktrees) (tags keep all history reachable; only `main` + `chore/reboot` remain)
- [x] Back up `.env.enc` outside the repo → `~/ai-monorepo-backups/2026-09-27-reboot/` (also consider a password manager)
- [~] `git worktree prune` done. The 11 Cursor worktrees were NOT removed: all hold uncommitted changes (backed up in `~/ai-monorepo-backups/2026-09-27-reboot/cursor-worktrees/`). Your call: remove via Cursor or `git worktree remove --force <path>`, then `git branch -D ios-drawer-fix-LCohy responsive-dialog-fix-CyKGP`
- [ ] After `gh auth login`: close open PRs #8, #9, #10, #12, #13 with a comment pointing to the reboot PR + `archive/*` tags, then delete their 6 remote branches (see `4-branch-triage.md` execution log)
- [x] Commit this reboot folder (`.llms/plan/00-reboot-2026-09/`) + memory updates on the new baseline branch in Phase 1

## Phase 1 — Baseline on current versions (1–2 sessions)

Goal: know exactly what works at `6b926f0` *before* touching any version.

- [ ] Work on `chore/reboot` (created in Phase 0; all reboot work lives here → one PR to main)
- [ ] `make install` / `make dev` in Docker — exact commands, env files and test checklist: `5-setup-and-run.md`. Expect to re-setup:
  - Clerk keys (dev instance still alive?)
  - Convex dev deployment (`make convex-dev-once`; project may have been paused/deleted after inactivity)
  - AI provider keys (OpenAI / Anthropic / Google) — check they're still valid and the model ids in `packages/ai/src/model.registry.ts` still exist
  - Cloudflare / alchemy creds (only needed for deploy)
  - Source of truth for required vars = env contracts in `packages/env`
- [ ] Run `pnpm run check-types`, `pnpm run test`, lint. Record results (TS6305 in `apps/server` was pre-existing).
- [ ] Manual smoke QA, desktop + mobile (write results in `baseline-report.md` in this folder):
  - [ ] sign in / sign out (logged-out state was known broken)
  - [ ] new chat → send → stream → complete
  - [ ] refresh mid-stream (resume)
  - [ ] second window streaming same thread
  - [ ] switch threads fast (instant nav + reveal)
  - [ ] long thread: initial scroll at bottom, load older, scroll up fast (Safari too)
  - [ ] sidebar: scroll/load more, context menu (INP), mobile open/close
  - [ ] model selector, code blocks (highlight in worker), math, links modal
  - [ ] draft persistence
- [ ] Output: `baseline-report.md` = what works, what's broken, with repro steps. Broken things are **not fixed now** — just listed.

## Phase 2 — Upgrade everything (one family per commit)

Rules: no refactors, no new features, only what's needed to compile + keep baseline behavior. After each step: check-types + test + smoke subset. Log every notable change/breakage in `upgrade-log.md` in this folder (read the official migration guide per lib first — AGENTS.md rule: context7/docs before upgrading).

Order (foundations first, highest-risk-for-messages last-ish):

1. [ ] Tooling: node, pnpm, TypeScript, biome/ultracite, turbo, vite, vitest, tsdown, wrangler
2. [ ] React + react-dom (we rely on `<Activity>`)
3. [ ] Convex + convex-helpers + `@convex-dev/*` (agent is used in web for smooth text)
4. [ ] Clerk
5. [ ] oRPC (all `@orpc/*` via catalog)
6. [ ] TanStack Router (+ regenerate route tree) + TanStack Query
7. [ ] **AI SDK** (`ai`, `@ai-sdk/*`) — biggest impact on the messages pipeline. Review: `OrpcChatTransport`, `use-ai-sdk-chat.tsx`, `createUiMessageFromChunks`, `deltaStreamChunker`, `MyUIMessage` types, api-service chat router
8. [ ] **Streamdown** — check whether your upstream contribution (startTransition swap + worker docs) landed; if yes drop the `/app/.tmp` tarball. Re-verify worker highlighter plugin contract.
9. [ ] shadcn/ui + Radix + **ai-elements** registry refresh (was parked backlog `ai-elements-full-registry-refresh`). L1 folders are immutable: re-pull, diff, keep app logic in L2 wrappers.
10. [ ] **LegendList** `3.0.0-beta.47` → latest (stable?). Re-run the long-thread + sidebar smoke.
11. [ ] The rest: zod, hono, alchemy (TODO.md warns alchemy upgrade breaks `env.ts` import), dotenv, nanoid…
12. [ ] Refresh `.llms/git-references/*` submodules (t3code, legendlist, streamdown, ai, legend-state, tanstack-virtual, virtua, pretext, ai-elements…)
13. [ ] Remove `packages/tmp` (rivet experiment) — confirmed
14. [ ] Re-run full smoke; update `baseline-report.md` → "post-upgrade" column

## Phase 3 — Make `main` real + automation-ready

- [ ] PR `chore/reboot` → `main` (merge commit, keep history). This is the new solid base.
- [ ] CI on PRs: install, check-types, lint, test (prerequisite for the agent/PR workflow you want)
- [ ] Delete merged/archived branches (tags from Phase 0 keep everything reachable)
- [ ] Refresh `AGENTS.md` for the new workflow (PR-based, CI green required, where plans live)
- [ ] Update `.llms/memory/*` (mental_board, core_facts: "main is the base, feature branches via PR")

## Phase 4 — Re-research, then one grill (before any big track)

Research questions (write answers into `research-2026-10.md` here):
- [ ] **t3code today**: what does their message timeline use now? (local copy from Apr 5 = TanStack Virtual + 8 always-unvirtualized tail rows + current turn unvirtualized + width-scoped measurement cache + text-based height estimate + `shouldAdjustScrollPositionOnItemSizeChange` only when item is off-screen; zustand stores). Did they move to LegendList? What do they do for initial bottom anchor?
- [ ] **LegendList stable**: chat features (window scroll initial-at-end, `maintainVisibleContentPosition`, `alignItemsAtEnd`), fixes for Safari / `getItemType` / big-item shift
- [ ] **AI SDK**: anything new that replaces our resumed-stream chunk rebuild, throttling, message identity/handoff?
- [ ] **pretext** (reference repo present): viable for height estimation of markdown rows?
- [ ] Then **one grill session** with `3-messages-architecture.md` as input → confirm or change decisions → one PRD for Track A.

## Phase 5 — Roadmap (tracks, in order)

Detail and sources for each item: `2-idea-inventory.md`.

| order | track | why this order |
|---|---|---|
| A | **Messages store** (rebuild v4 on new base) | foundation; removes the churn that polluted every other perf investigation |
| B | **Conversation virtualization + scroll** (initial anchor, submit scroll, load older w/o shift, big-message shift) | needs A; then choose LegendList vs TanStack+unvirtualized tail with a clean signal |
| C | **Interaction perf** (sidebar context menu INP, model selector, code block, sidebar edge-toggle lag) | independent, small, great for learning + first agent PRs |
| D | **Prompt input + draft** rethink | known broken; own PRD exists in TODO |
| E | **MVP gaps** (logged-out state, anonymous accounts, bot protection, delete thread, native drawer) | product completeness |
| F | Later / parked (paginated local cache, WASM highlighter, env v2, client-id complex rollout, UI primitives unification, branching/workspaces) | backlog |

Track C items are good candidates to run in parallel with A (small, isolated, PR-sized).

## Decisions (answered 2026-09-27)

1. Base = `6b926f0` — **confirmed**
2. Dev stays **Docker-only** (user's own setup; never assume host tooling — ask when unclear)
3. Remove `packages/tmp` — **confirmed**
4. Old March branches (instant-nav, tail-reserve) — **dead**: all their files were rewritten by #11. Ideas archived; phase-2 "thread session architecture" kept as an idea in inventory track D. See `4-branch-triage.md`.
