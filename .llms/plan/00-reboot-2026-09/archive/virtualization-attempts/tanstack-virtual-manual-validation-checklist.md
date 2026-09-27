# Step 6 - Manual Validation Checklist (TanStack Virtual Rewrite)

PRD reference: `.llms/ralph/prd.md`

## Scope

- Validate PRD acceptance criteria after Step 5h.
- Capture pass/fail evidence for rollback-safe release decision.

## Preconditions

- Build target: current branch HEAD.
- Browser scope: latest evergreen desktop + mobile.
- Data setup:
  - At least 1 short thread (< 10 msgs).
  - At least 1 long thread (200+ msgs, mixed sizes).

## Matrix (required)

1. Sidebar overlay/backdrop behavior
   - Action: open/close sidebar, scroll through threads under header/footer overlays.
   - Pass: content flows under overlays; no clipping/regression.

2. Sidebar infinite load trigger timing
   - Action: scroll near thread list end repeatedly.
   - Pass: `onLoadMore` triggers around `(count - 1 - 6)` virtual row threshold; no rapid duplicate bursts.

3. Conversation scroll ownership
   - Action: open thread, wheel/touch scroll conversation.
   - Pass: window/document scroll is authoritative; no effective inner conversation scroller.

4. Initial anchor behavior
   - Action: open short and long thread from sidebar.
   - Pass: initial anchor lands at expected bottom checkpoint without drift/jump.

5. Submit-triggered scroll behavior
   - Action: send message when near bottom and when slightly above bottom.
   - Pass: probe-based submit scroll still reaches bottom intent; no smooth/floating drift.

6. Scroll-to-bottom button behavior
   - Action: scroll up, click button during dynamic last-row resize.
   - Pass: button action settles to bottom within bounded retries; no stuck half-bottom state.

7. Streaming no forced auto-follow
   - Action: start stream, scroll up during stream.
   - Pass: viewport does not continuously auto-follow while user reads older content.

8. Long thread smoothness + blank flash check
   - Action: fast wheel/touch scroll in long thread.
   - Pass: no blank flashes; scrolling remains fluid.

9. Mobile keyboard + sticky input
   - Action: focus input, open keyboard, send message, dismiss keyboard.
   - Pass: sticky input behavior unchanged; no jumpy viewport shifts.

## Acceptance Criteria Mapping

- AC1 (window scroll ownership): matrix #3.
- AC2 (sidebar element scroll + overlay): matrix #1 and #2.
- AC3 (fake sidebar virtualization removed): code inspection only, already implemented.
- AC4 (no fallback/toggle path): code inspection only, already implemented.
- AC5 (probe contract retained): matrix #4, #5, #6.
- AC6 (no forced streaming follow): matrix #7.
- AC7 (`onLoadOlder` API slot exists, unwired): code inspection only, already implemented.
- AC8 (INP p75 <= 200ms): run INP sampling during matrix #4-#8 interactions.

## Evidence Log Template

- Date:
- Commit SHA tested:
- Browser/device:
- Result summary: pass/fail
- Failing cases (if any):
  - Case:
  - Repro steps:
  - Observed:
  - Expected:
