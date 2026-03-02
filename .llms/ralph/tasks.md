## Sidebar Refactor Task Breakdown

PRD: `.llms/ralph/prd.md`

Legend: `[x] done` `[>] next` `[ ] pending`

### Tasking bootstrap

- [x] `T0.1` Create smallest-unit task ledger for this PRD with done/pending status.

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
- [ ] `S5.3` Run manual QA pass for `/components/sidebar` checklist items.
- [ ] `S5.4` Run manual QA pass for `/components/sidebar-thread-item` checklist items.
- [ ] `S5.5` Run feedback loop `pnpm run check-types` after manual pass and log result.
- [ ] `S5.6` Update QA result log from `partial` to final status with route-by-route notes.

## Task Selection

- Selected next task (this iteration): `[x] T0.1` Create smallest-unit task ledger for PRD execution control.
- Completed outcome: task ledger added in this file.
- Next queued task: `[>] S5.3` Run manual QA pass for `/components/sidebar` checklist items and record outcomes.
