# Step 6d - Runtime Execution Protocol (TanStack Virtual Rewrite)

PRD reference: `.llms/ralph/prd.md`

## Task completed

- Add deterministic run protocol for pending runtime ACs (AC1, AC2, AC5, AC6, AC8).
- Scope is docs-only; no behavior/code changes.
- Primary evidence target stays `.llms/ralph/step-6c-runtime-evidence.md`.

## Sources (official)

- INP threshold guidance (`<= 200ms` good at p75): https://web.dev/articles/inp
- DevTools runtime recording + live metrics workflow: https://developer.chrome.com/docs/devtools/performance/reference

## Test run protocol

1. Checkout target commit.
2. Prepare data:
   - one short thread (<10 messages),
   - one long thread (200+ mixed-size messages).
3. Desktop run first (latest Chrome).
4. Mobile run second (latest evergreen mobile browser).
5. For each matrix case in `.llms/ralph/step-6c-runtime-evidence.md`, fill fields inline:
   - `Status`
   - `Steps run`
   - `Observed`
   - `Expected`
   - `Verdict`
6. Mark case `PASS` only if behavior is stable across 3 repeated attempts on same device class.

## Execution order (per device class)

1. Case 1 (sidebar overlay/backdrop)
2. Case 2 (sidebar load-more threshold)
3. Case 3 (window scroll ownership)
4. Case 4 (initial anchor)
5. Case 5 (submit scroll)
6. Case 6 (scroll-to-bottom settle)
7. Case 7 (no forced streaming follow)
8. Case 8 (long-thread smoothness/blank flash)
9. Case 9 (mobile keyboard + sticky input; skip on desktop)

## INP evidence protocol (AC8)

1. Open Chrome DevTools `Performance` panel.
2. Use live metrics view to monitor INP while executing cases 4-8 interactions.
3. Record 20+ representative interactions total (mix: open thread, submit, scroll-to-bottom click, scroll-up during stream, fast long-thread wheel/touch).
4. Capture interaction latencies in milliseconds.
5. Compute sample p75:
   - sort latencies ascending,
   - index = `ceil(0.75 * N)` (1-based),
   - p75 = value at that index.
6. Write into `.llms/ralph/step-6c-runtime-evidence.md` INP block:
   - `Metric source/tool`: `Chrome DevTools Performance live metrics + manual sample`
   - `Interaction sample size`: `N`
   - `p75 INP`: computed value
   - `Gate (<= 200ms) pass/fail`

## Pass/fail rollup rule

- AC1/AC2/AC5/AC6/AC8 are `PASS` only when all mapped runtime cases pass.
- If any case fails, set `Overall runtime validation: FAIL` and add repro notes before any code change.

## Notes for next iteration

- Next slice is execution-only: run protocol on desktop+mobile and replace all `PENDING` in `step-6c`.
- Do not tune overscan/estimate/useFlushSync until runtime evidence shows need.
