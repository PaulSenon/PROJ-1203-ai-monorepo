# Step 6c - Runtime Validation Evidence (TanStack Virtual Rewrite)

PRD reference: `.llms/ralph/prd.md`

## Task completed

- Prepared runtime evidence log for manual matrix cases tied to AC1, AC2, AC5, AC6, AC8.
- Kept AC3/AC4/AC7 out of scope here (already covered in `step-6b-code-inspection-evidence.md`).

## Run metadata

- Date:
- Commit SHA tested:
- Browser/device:
- Tester:

## Runtime matrix evidence

### Case 1 - Sidebar overlay/backdrop behavior (AC2)

- Status: PENDING
- Steps run:
- Observed:
- Expected:
- Verdict:

### Case 2 - Sidebar infinite load trigger timing (AC2)

- Status: PENDING
- Steps run:
- Observed:
- Expected:
- Verdict:

### Case 3 - Conversation scroll ownership (AC1)

- Status: PENDING
- Steps run:
- Observed:
- Expected:
- Verdict:

### Case 4 - Initial anchor behavior (AC5)

- Status: PENDING
- Steps run:
- Observed:
- Expected:
- Verdict:

### Case 5 - Submit-triggered scroll behavior (AC5)

- Status: PENDING
- Steps run:
- Observed:
- Expected:
- Verdict:

### Case 6 - Scroll-to-bottom button behavior (AC5)

- Status: PENDING
- Steps run:
- Observed:
- Expected:
- Verdict:

### Case 7 - Streaming no forced auto-follow (AC6)

- Status: PENDING
- Steps run:
- Observed:
- Expected:
- Verdict:

### Case 8 - Long thread smoothness + blank flash check (AC8 support)

- Status: PENDING
- Steps run:
- Observed:
- Expected:
- Verdict:

### Case 9 - Mobile keyboard + sticky input (AC8 support)

- Status: PENDING
- Steps run:
- Observed:
- Expected:
- Verdict:

## INP evidence (AC8)

- Metric source/tool:
- Interaction sample size:
- p75 INP:
- Gate (`<= 200ms`) pass/fail:
- Notes:

## Rollup

- AC1: PENDING
- AC2: PENDING
- AC5: PENDING
- AC6: PENDING
- AC8: PENDING
- Overall runtime validation: PENDING

## Notes for next iteration

- Execute matrix on desktop + mobile and replace all PENDING fields with measured evidence.
- If any case fails, capture repro + likely owning module before code change.
