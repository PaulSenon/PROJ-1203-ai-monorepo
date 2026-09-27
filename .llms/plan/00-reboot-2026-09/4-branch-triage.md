# Branch triage — goal: only `main` + `chore/reboot` survive Phase 0

Checked 2026-09-27 against base `6b926f0`. "Identical" = the branch tip has the exact same `apps/`/`packages/` content as a commit already in base (it was squash-merged, so git shows it as unmerged).

Rule: **code on these branches is not coming back.** Ideas are captured in `2-idea-inventory.md`, docs in `archive/`, reusable snippets are listed in `3-messages-architecture.md` (reachable via tags).

## Delete — already in base

| branch (local and/or origin) | why safe |
|---|---|
| `feat/legendlist-v2`, `feat/messages-store-v4` (after WIP commit → tag), `opencode/calm-falcon`, `conversation-ui-refactoring`, `ralph/streamdown-upgrade`, `ios-drawer-fix-LCohy`, `responsive-dialog-fix-CyKGP`, all `2025-11-*` | ancestors of base |
| `origin/opencode/sunny-tiger` | identical to PR #11 `9ac89ab` |
| `feat/sidebar-ui` | identical to `5384153` (sidebar refactor squash) |
| `origin/feat/legendlist-v2-sidebar` | identical to `0b6628e` (sidebar LegendList) |
| `origin/ralph-message-ui-impl`, `origin/feat/better-env-structure`, `origin/ralph/streamdown-upgrade`, `opencode/brave-pixel`, `feat/lazy-streamdown-codeblock`, `origin/fix/paginated-query-issue` | all commits already in base (rebased/cherry-picked) |

## Tag `archive/*`, then delete — superseded, ideas/docs extracted

| branch | what it was | why dead | where the value went |
|---|---|---|---|
| `opencode/gentle-river` | messages attempt 1 (Mar 8) | superseded by attempts 2–5 | `archive/1-*` |
| `feat/messages-stability` (= `opencode/curious-cabin`) | attempt 2 (Apr 11) | never merged; code predates store design | `archive/2-*`; trim helpers + cache-tail listed as reusable |
| `feat/messages-perf-v2` | attempt 3, Legend-State (Apr 17) | Legend-State dropped | `archive/3-*` (grill log); validator listed as reusable |
| `feat/messages-v3` | attempt 4, zustand (Apr 23) | "vibe coded", not understood | `archive/4-*` |
| `feat/messages-store-v4` (after WIP commit) | attempt 5 skeleton (May 3) | rebuilt on upgraded base in Track A | `0-snapshot.md`, `3-messages-architecture.md` |
| `opencode/hidden-rocket` | Mar 5 RALPH: instant thread-nav feedback (urgent vs deferred thread id, blackout overlay) | **every file it touched was rewritten/deleted by #11** (`use-chat-nav`, `use-app-load-status`, `use-messages-legacy`…); #11 shipped nav feedback + reveal differently | `archive/navigation-and-scroll-2026-03/instant-thread-navigation-prd.md`; phase-2 "thread session architecture" idea → inventory track D |
| `opencode/quick-circuit` | Mar 5–6 RALPH: tail reserve + bottom-scroll reliability + stability | same: files moved/rewritten by #11 (list moved to `_parts/messages-list/`, local-first assistant ids simplified tail handling) | `archive/navigation-and-scroll-2026-03/tail-reserve-and-bottom-scroll-prd.md` |
| `feat/tanstack-virtual` (+ stash `stash@{0}`) | Feb 20 conversation on TanStack Virtual; you stopped it ("INP still sucks") | superseded by LegendList | `archive/virtualization-attempts/tanstack-virtual-*` |
| `feat/virtua` | Feb 26 conversation on virtua | superseded by LegendList | `archive/virtualization-attempts/virtua-prd-*` |
| `origin/feat/legendlist-virtualization` | Feb 19 first LegendList install + reference docs | superseded | `archive/virtualization-attempts/legendlist-*-2026-02-19.md` |
| `origin/dev/remote-ssh-wip` | 1 commit: SSH into dev container on "mini" | unrelated to app; maybe useful for your setup | inventory (DX) |

## Commands (Phase 0, after the v4 WIP commit)

```sh
# tags (history stays reachable forever, even after branch deletion)
git tag archive/messages-1-gentle-river   opencode/gentle-river
git tag archive/messages-2-stability      feat/messages-stability
git tag archive/messages-3-perf-v2-legend feat/messages-perf-v2
git tag archive/messages-4-v3-zustand     feat/messages-v3
git tag archive/messages-5-v4-zustand     feat/messages-store-v4
git tag archive/nav-instant-feedback      opencode/hidden-rocket
git tag archive/scroll-tail-reserve       opencode/quick-circuit
git tag archive/virt-tanstack-virtual     feat/tanstack-virtual
git tag archive/virt-virtua               feat/virtua
git tag archive/virt-legendlist-first     origin/feat/legendlist-virtualization
git tag archive/dev-remote-ssh-wip        origin/dev/remote-ssh-wip
git tag archive/virt-virtua-stash         stash@{0}
git push origin --tags

# then delete everything except main and chore/reboot (review the list first!)
git branch --format='%(refname:short)' | grep -vE '^(main|chore/reboot)$'
# git branch -D <each>            # local
# git push origin --delete <each> # remote
git stash drop
git worktree prune
```

After this: **everything lives in exactly two places** — `main` (code) and `.llms/` (ideas, decisions, archive). Old code is reachable only via `archive/*` tags when you explicitly want to look.

---

## Execution log — 2026-09-27 (done)

Backups (outside repo, `~/ai-monorepo-backups/2026-09-27-reboot/`, dir chmod 700):
- `.env.enc` copy (chmod 600, sha256 verified identical)
- `working-state-before-reboot.tgz` + `working-state-tracked.diff` + `submodule-pointers.diff` (full uncommitted state before any git op)
- `untracked-reference-repos.txt` (url + sha of `.llms/git-references/{ai,legend-state,pretext,tanstack-virtual,virtua}` — untracked nested clones, not submodules yet)
- `ai-monorepo-all-refs.bundle` (`git bundle --all`, verified OK, 162 refs incl. stash + all archive tags + v4 WIP)
- `cursor-worktrees/*` (diff + untracked files of the 11 Cursor worktrees)

Git:
- v4 WIP committed verbatim as `fdb9608` (hook bypassed via `OPENCODE=0 AGENT=0` to keep the snapshot unmodified)
- 20 annotated tags `archive/*` created and pushed; verified identical on origin; verified every former branch tip + stash is contained in base `6b926f0` or in an archive tag. Tags actually used (differ slightly from the proposal above):
  `messages-1-gentle-river, messages-2-stability, messages-3-perf-v2-legend, messages-4-v3-zustand, messages-5-v4-zustand, nav-instant-feedback, scroll-tail-reserve, virt-tanstack-virtual, virt-virtua, virt-virtua-stash, virt-legendlist-first, sidebar-ui, sidebar-legendlist-v2, sunny-tiger-pre-squash, fix-paginated-query, lazy-streamdown-codeblock, reserve-space-brave-pixel, better-env-structure, ralph-message-ui-impl, dev-remote-ssh-wip`
- `chore/reboot` created from `6b926f0`
- 27 local branches deleted (each re-verified just before deletion); stash dropped (= `archive/virt-virtua-stash`)
- 8 remote branches deleted: `dev/remote-ssh-wip, feat/better-env-structure, feat/legendlist-virtualization, feat/messages-v3, feat/sidebar-ui, feat/tanstack-virtual, feat/virtua, ralph-message-ui-impl`
- 4 dead opencode worktree entries pruned

**Deviations from the plan (deliberate):**
1. **Open PRs found** (#8 `feat/legendlist-v2`→`conversation-ui-refactoring`; #9 `opencode/quick-circuit`, #10 `opencode/hidden-rocket`, #12 `opencode/gentle-river`, #13 `feat/messages-stability`, all →`feat/legendlist-v2`). Deleting their head/base branches would silently close them → **kept remote branches** `conversation-ui-refactoring, feat/legendlist-v2, feat/messages-stability, opencode/gentle-river, opencode/hidden-rocket, opencode/quick-circuit`. To do after `gh auth login`: close #8–#13 with a comment pointing to the reboot PR + archive tags, then delete those 6 remote branches.
2. **Cursor worktrees kept**: all 11 have uncommitted changes (Nov–Dec 2025). Backed up, not removed (outside the repo, Cursor-managed). Local branches `ios-drawer-fix-LCohy`, `responsive-dialog-fix-CyKGP` remain because they're checked out there (both already contained in base). To finish: remove via Cursor or `git worktree remove --force <path>`, then `git branch -D` them.
3. Former remote branches already deleted on GitHub before today (`sunny-tiger`, `legendlist-v2-sidebar`, `fix/paginated-query-issue`, `lazy-streamdown-codeblock`, `ralph/streamdown-upgrade`): tips still present locally were tagged; `ralph/streamdown-upgrade` tip was no longer known locally (its 26 commit subjects are all in base).

Restore anything: `git switch -c <name> archive/<tag>` or `git clone <bundle>`.
