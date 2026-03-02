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
- [ ] Stress perf: 1000-row path scrolls without obvious jank.
- [ ] Placeholder actions parity: pin/rename/share/delete behavior unchanged (callbacks/no-op semantics preserved).
- [ ] Demo coverage: happy path, dense list, edge states validated in both routes.

### Route-specific checks

#### `/components/sidebar`

- [ ] Header new-chat button works and does not regress floating controls behavior.
- [ ] Load-more sentinel still triggers at list bottom without loop/jitter.
- [ ] Mobile open/select flow keeps expected auto-close behavior.

#### `/components/sidebar-thread-item`

- [ ] Row presets 20/200/1000 switch instantly and keep interaction parity.
- [ ] Mobile mode toggle preserves menu + action behavior.
- [ ] Active UUID override updates highlight deterministically.
- [ ] Action log captures invoked callback and row identity correctly.

### Result log

#### 2026-03-02 run 1

- Date: 2026-03-02
- Tester: OpenCode (gpt-5.3-codex)
- Result: partial
- Notes: checklist execution prepared and pending manual route interaction pass on `/components/sidebar` + `/components/sidebar-thread-item`; pre-commit `pnpm run check-types` still blocked by pre-existing `apps/server` TS6305 (`@ai-monorepo/api-service` dist `.d.ts` build-order issue), no new blocker introduced in this task.
