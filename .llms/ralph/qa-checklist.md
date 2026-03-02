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

- Date:
- Tester:
- Result: pass | fail | partial
- Notes:
