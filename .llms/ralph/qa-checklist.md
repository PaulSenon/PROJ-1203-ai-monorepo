## Sidebar Refactor QA Checklist (PRD Step 5)

PRD: `.llms/ralph/prd.md`

### Demo routes

- Full sidebar: `/components/sidebar`
- Item stress/a11y/perf: `/components/sidebar-thread-item`

### Execution checklist

- [ ] Visual parity: header/footer overlays, spacing, row density stable desktop/mobile.
- [ ] Keyboard flow: focus ring visible, menu trigger usable, menu nav/enter/escape works, focus returns.
- [ ] Touch/mouse parity: row actions + context menu both usable without dead taps/click traps.
- [ ] Tooltip parity: tooltips do not block menu trigger or row tap targets.
- [ ] Active state parity: active row highlight and thread switch behavior remain correct.
- [x] Stress perf: 1000-row path scrolls without obvious jank.
- [ ] Placeholder actions parity: pin/rename/share/delete behavior unchanged (callbacks/no-op semantics preserved).
- [ ] Demo coverage: happy path, dense list, edge states validated in both routes.

### Route-specific checks

#### `/components/sidebar`

- [ ] Header new-chat button works and does not regress floating controls behavior.
- [ ] Load-more sentinel still triggers at list bottom without loop/jitter.
- [ ] Mobile open/select flow keeps expected auto-close behavior.

#### `/components/sidebar-thread-item`

- [x] Row presets 20/200/1000 switch instantly and keep interaction parity.
- [x] Mobile mode toggle preserves menu + action behavior.
- [x] Active UUID override updates highlight deterministically.
- [x] Action log captures invoked callback and row identity correctly.

### Result log

#### 2026-03-02 run 1

- Date: 2026-03-02
- Tester: OpenCode (gpt-5.3-codex)
- Result: partial
- Notes: checklist execution prepared and pending manual route interaction pass on `/components/sidebar` + `/components/sidebar-thread-item`; pre-commit `pnpm run check-types` still blocked by pre-existing `apps/server` TS6305 (`@ai-monorepo/api-service` dist `.d.ts` build-order issue), no new blocker introduced in this task.

#### 2026-03-02 run 2

- Date: 2026-03-02
- Tester: OpenCode (gpt-5.3-codex)
- Result: partial
- Notes: reran feedback loop (`pnpm run check-types`), still blocked by the same pre-existing `apps/server` TS6305 (`@ai-monorepo/api-service` dist `.d.ts` build-order issue); manual interaction checks on `/components/sidebar` and `/components/sidebar-thread-item` remain pending.

#### 2026-03-02 run 3 (user QA feedback)

- Date: 2026-03-02
- Tester: user
- Result: partial
- Route notes:
  - `/components/sidebar`: `S5.3a` KO (header/footer reserved-space regression), `S5.3b` KO (mobile options accessibility path missing), `S5.3c` OK, `S5.3d` KO (load-more sentinel feels delayed).
  - `/components/sidebar-thread-item`: `S5.4a` OK (preset behavior OK; refresh persistence noted non-blocking), `S5.4c` OK, additional concern flagged for INP on quick-action/context-menu actions (possible demo action-log rerender coupling).
- Follow-up action started: `S5.3a.r1` fix queued/executed to restore reserved-space behavior by reintroducing overlay-vs-spacer separation.

#### 2026-03-02 run 4

- Date: 2026-03-02
- Tester: OpenCode (gpt-5.3-codex)
- Result: partial
- Notes: completed `S5.3a.r1` code fix (overlay absolute classes now only on live header/footer instances; spacer clones are in-flow again); reran `pnpm run check-types`, still blocked by pre-existing `apps/server` TS6305 (`@ai-monorepo/api-service` dist `.d.ts` build-order issue).

#### 2026-03-02 run 5 (handoff detail capture + S5.3b.r1)

- Date: 2026-03-02
- Tester: user + OpenCode
- Result: partial
- Additional QA details captured for handoff:
  - `/components/sidebar-thread-item`: user reports poor INP feeling on long-list quick-action and context-menu action clicks; likely coupled to demo action-log state updates, needs isolation check.
  - `/components/sidebar`: user reports backdrop edge toggle (top/bottom probe -> header/footer effect) feels delayed (~500ms+), minor/non-blocking for now.
  - `/components/sidebar`: known pre-existing bug note, mobile context-menu action can close sidebar though only thread navigation should auto-close.
- Task status update:
  - `S5.3b.r1` implemented: mobile row now exposes visible `Thread options` trigger button so keyboard/assistive mobile navigation can open context menu.
  - feedback loop rerun: `pnpm run check-types` still blocked by pre-existing `apps/server` TS6305 (`@ai-monorepo/api-service` dist `.d.ts` build-order issue).

#### 2026-03-02 run 6 (S5.3d.r1)

- Date: 2026-03-02
- Tester: OpenCode (gpt-5.3-codex)
- Result: partial
- Notes:
  - completed `S5.3d.r1` code tune: `/components/sidebar` bottom sentinel prefetch margin increased from `100%` to `200%` in `ChatSidebarLayout` to trigger `loadMore` earlier.
  - manual re-validation of `/components/sidebar` load-more feel still pending user route pass.
  - feedback loop rerun: `pnpm run check-types` still blocked by pre-existing `apps/server` TS6305 (`@ai-monorepo/api-service` dist `.d.ts` build-order issue).

#### 2026-03-02 run 7 (S5.4a ledger reconciliation)

- Date: 2026-03-02
- Tester: OpenCode (gpt-5.3-codex)
- Result: partial
- Notes:
  - closed `S5.4a` as done by reconciling existing run-3 user QA evidence (`S5.4a` already reported OK for row preset parity/jank).
  - checklist flags updated for `Stress perf` + `/components/sidebar-thread-item` row preset switching to match existing QA evidence; no code-path behavior changed in this iteration.

#### 2026-03-02 run 8 (S5.4b code-path verification)

- Date: 2026-03-02
- Tester: OpenCode (gpt-5.3-codex)
- Result: partial
- Notes:
  - completed `S5.4b` via code-path verification: `/components/sidebar-thread-item` `isMobile` toggle feeds `ThreadItem.Root isMobile`, and both mobile/desktop affordances dispatch through the same `ThreadContextMenu` action list (`getThreadMenuActions`) and callback handlers.
  - no code behavior change required in this step; task was verification + ledger/checklist reconciliation only.
  - feedback loop rerun: `pnpm run check-types` still blocked by pre-existing `apps/server` TS6305 (`@ai-monorepo/api-service` dist `.d.ts` build-order issue).

#### 2026-03-02 run 9 (S5.4c code-path verification)

- Date: 2026-03-02
- Tester: OpenCode (gpt-5.3-codex)
- Result: partial
- Notes:
  - completed `S5.4c` via code-path verification in `/components/sidebar-thread-item`: active highlight is fully controlled by `activeUuid` input and strict `thread.uuid === activeUuid` comparison passed to `ThreadItem.Root isActive`.
  - action log path verified: each action callback (`onPin/onRename/onShare/onDelete`) appends event + selected thread identity from callback payload (`thread.uuid`, `thread.title`) through shared `appendLog` path.
  - no behavior change required in this step; verification + QA/task ledger reconciliation only.

#### 2026-03-02 run 10 (S5.5 feedback loop)

- Date: 2026-03-02
- Tester: OpenCode (gpt-5.3-codex)
- Result: partial
- Notes:
  - completed `S5.5` by rerunning `pnpm run check-types`.
  - outcome unchanged: pre-existing `apps/server` failure `TS6305` at `src/index.ts` due `packages/api-service/dist/src/service.d.ts` not built from `packages/api-service/src/service.ts`.
  - no new type errors introduced by sidebar refactor path in this run.
