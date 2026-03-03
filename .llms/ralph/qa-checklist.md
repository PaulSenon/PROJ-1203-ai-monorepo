# Sidebar Virtualization QA Checklist

Source PRD: `.llms/ralph/prd.md`

## Status

- owner: user/manual
- scope: sidebar LegendList virtualization parity
- run date: 2026-03-03

## Preconditions

- seeded account with long thread history (>= 200 threads)
- desktop + mobile viewport/device available
- route targets:
  - app: `/chat/{threadUuid}`
  - demo: `/components/sidebar`

## Scenarios

Use report fields exactly: `scenario`, `expected`, `observed`, `pass/fail`, `notes`.

| scenario | expected | observed | pass/fail | notes |
| --- | --- | --- | --- | --- |
| fast scroll down/up with long history (desktop) | no blank rows, no jump correction, no flicker | TODO | TODO | |
| fast scroll down/up with long history (mobile) | same visual stability as desktop; no drawer glitches | TODO | TODO | |
| repeated end reach while `canLoadMore=true` | load-more always triggers until exhausted | TODO | TODO | |
| repeated end reach while in-flight | no duplicate burst; queued retry semantics preserved | TODO | TODO | |
| top/middle/bottom traversal | header/footer blur edge states match overflow correctly | TODO | TODO | |
| active thread switch from sidebar item | highlight + navigation parity unchanged | TODO | TODO | |
| context menu + quick actions during rapid scroll | no stuck menu/tooltip/action artifacts | TODO | TODO | |
| mobile open/close + autoclose on navigation | persisted mount + autoclose behavior unchanged | TODO | TODO | |
| sidebar virtualization path log scan | no debug instrumentation/logging left in final patch | TODO | TODO | |

## Feedback loop

| scenario | expected | observed | pass/fail | notes |
| --- | --- | --- | --- | --- |
| `pnpm run check-types` | succeeds repo-wide | fails at `apps/server/src/index.ts(1,40)` with TS6305: `packages/api-service/dist/src/service.d.ts` build-order mismatch vs `packages/api-service/src/service.ts` | fail (blocked, pre-existing) | web also exits after upstream server failure |

## Result

- verdict: blocked (awaiting user/manual QA execution + server TS6305 pre-existing failure)
- blockers: manual QA scenarios still TODO (user-owned); pre-existing server TS6305 build-order mismatch blocks repo-wide check-types green
- follow-up task id: S5.4-manual-qa-run-and-report
