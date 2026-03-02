## Sidebar Refactor Task Breakdown

PRD: `.llms/ralph/prd.md`

Legend: `[x] done` `[>] next` `[ ] pending`

### Tasking bootstrap

- [x] `T0.1` Create smallest-unit task ledger for this PRD with done/pending status.
- [x] `T0.2` Re-slice remaining Step 5 work into single-change micro-tasks.
- [x] `T0.3` Capture new post-final user QA feedback in PRD and reseed remediation micro-task queue before code changes.

### Step 1 - L2 contracts + namespaces

- [x] `S1.1` Define canonical shell surface in `components/ui-custom/sidebar/sidebar-shell.tsx`.
- [x] `S1.2` Keep `components/ui-custom/sidebar/sidebar.tsx` marked legacy/transitional.
- [x] `S1.3` Keep item composition surface in `components/ui-custom/sidebar/sidebar-item.tsx`.

### Step 2 - Move app-aware item logic to L3

- [x] `S2.1` Extract thread status mapping into `use-thread-item-state` hook.
- [x] `S2.2` Keep item rendering in L3 `ThreadItem.*` composition only.

### Step 3 - Recompose full sidebar in L3

- [x] `S3.1` Compose chat sidebar layout from `sidebar-shell.tsx` in `chat/sidebar/sidebar-layout.tsx`.
- [x] `S3.2` Remove `ui-custom/sidebar/sidebar.tsx` imports from L3 sidebar path.
- [x] `S3.3` Align `/components/sidebar` demo to L3 `ChatSidebarLayout` path.

### Step 4 - Remove fake lazy path + simplify contracts

- [x] `S4.1` Remove fake lazy mount Activity/content-visibility event path.
- [x] `S4.2` Remove dead prerender prop plumbing.
- [x] `S4.3` Remove dead `index` arg from `renderThreadItem` contract.
- [x] `S4.4` Make L3 `renderThreadItem` required; remove fallback item render path.

### Step 5 - Demo coverage + QA

- [x] `S5.1` Add dedicated `/components/sidebar-thread-item` demo route.
- [x] `S5.2` Add Step 5 QA checklist doc mapping PRD polishing requirements.
- [x] `S5.3a` `/components/sidebar`: verify visual parity (header/footer overlays, spacing, row density) desktop + mobile.
- [x] `S5.3b` `/components/sidebar`: verify keyboard flow (focus visibility, trigger/menu nav, focus return).
- [x] `S5.3c` `/components/sidebar`: verify touch/mouse parity + tooltip non-interference.
- [x] `S5.3d` `/components/sidebar`: verify active-row parity, load-more sentinel behavior, mobile auto-close, placeholder action parity.
- [x] `S5.4a` `/components/sidebar-thread-item`: verify row preset switching (20/200/1000) keeps parity and no obvious jank.
- [x] `S5.4b` `/components/sidebar-thread-item`: verify mobile mode toggle preserves menu/action behavior.
- [x] `S5.4c` `/components/sidebar-thread-item`: verify active UUID override determinism + action log correctness.
- [x] `S5.5` Run feedback loop `pnpm run check-types` after manual QA passes and log result.
- [x] `S5.6` Update QA result log from `partial` to final status with route-by-route pass/fail notes.

### QA remediation micro-tasks (post run-3 feedback)

- [x] `S5.3a.r1` Restore header/footer reserved-space behavior for `/components/sidebar` while keeping overlay glass-edge headers/footers.
- [x] `S5.3b.r1` Restore mobile accessibility path to thread options trigger (keyboard/assistive nav on row actions).
- [x] `S5.3d.r1` Tune `/components/sidebar` load-more sentinel responsiveness to remove perceived delay.

### QA remediation micro-tasks (post run-12 feedback)

- [x] `S5.3b.r2` Hide visible mobile three-dots affordance while preserving screenreader/keyboard path to thread options.
- [x] `S5.3a.r2` Remove perceptible header/footer backdrop edge-toggle delay in `/components/sidebar`.
- [ ] `S5.3d.r2` Improve load-more trigger cadence for fast scroll so pagination keeps up without debounce feel.
- [ ] `S5.3e.r1` Fix mobile context-menu action flow so non-navigation actions do not close sidebar.

## Task Selection

- Selected next task (this iteration): `[x] S5.3a.r2` remove perceptible header/footer backdrop edge-toggle delay in `/components/sidebar`.
- Completed outcome: memoized mapped `ThreadItem.Root` rows in `sidebar-layout.tsx` so top/bottom probe state flips (`isAtTop`/`isAtBottom`) no longer remap large thread lists on every scroll-edge toggle, reducing perceived backdrop edge lag.
- Next queued task: `[>] S5.3d.r2` improve load-more trigger cadence for fast scroll so pagination keeps up without debounce feel.
