# Reboot 2026-09 — index

Written 2026-09-27 after a ~5 month pause (last code touch: 2026-05-03).
Goal: get back to a solid, up-to-date, working base on `main`, without losing any idea, then resume the big tracks from that base.

Read in this order:

1. `1-plan.md` — **what to do next**, phase by phase, with checklists. Start here.
2. `0-snapshot.md` — where things stood when the project was paused (branches, attempts, bugs).
3. `2-idea-inventory.md` — every idea / TODO / WIP track found anywhere (code, TODO.md, memory, branches), grouped and sourced. Nothing should exist only in your head or on a dead branch anymore.
4. `3-messages-architecture.md` — the consolidated decisions for the messages store (the #1 technical track), distilled from 5 attempts + 2 grill sessions.
5. `4-branch-triage.md` — verdict for every branch: delete (already merged) or tag `archive/*` + delete. After Phase 0 only `main` + `chore/reboot` exist (+ execution log).
6. `5-setup-and-run.md` — Docker-only setup/run/stop commands, env files (names + where to get values), manual test checklist.

`archive/` — planning docs that previously lived **only on unmerged branches** (grill logs, PRDs, plans). Copied verbatim so branches can be deleted safely.

| archive folder | from branch |
|---|---|
| `1-gentle-river-2026-03/` | `opencode/gentle-river` |
| `2-messages-stability-2026-04-11/` | `feat/messages-stability` |
| `3-messages-perf-v2-legend-state-2026-04-17/` | `feat/messages-perf-v2` (grill log = gold) |
| `4-messages-v3-zustand-2026-04-23/` | `feat/messages-v3` |
| `virtualization-attempts/` | `feat/tanstack-virtual`, `feat/virtua`, `origin/feat/legendlist-v2-sidebar` |
| `navigation-and-scroll-2026-03/` | `opencode/hidden-rocket`, `opencode/quick-circuit` |
