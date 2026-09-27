# UI Visibility Coordinator — Ready Ticket / Callback Semantics Addendum

This addendum records only the newly validated ready-signaling semantics. It does not repeat earlier docs.

## Core principle frozen

A ready callback is **not** a generic "ready now" function.

Each `markReady` instance is bound to the **current ready ticket** for the relevant selector.

If a new ticket is emitted:
- a new `markReady` must be produced for that selector
- older `markReady` references become stale
- if an old callback is invoked later, it must be ignored safely

This is required to protect against async race conditions and persistent hidden activities.

## No global `ready: boolean`

The system should not rely on a global sticky `ready` boolean.

Instead, readiness means:

- **the current ticket for this selector has been acknowledged**
- or it has not

When a new run emits a new ticket for the same selector:
- the previous readiness no longer counts automatically
- no explicit boolean reset is required
- the reset is implicit in the new ticket identity

## Ticket ownership stays in the core

The React bindings must remain thin.

The binding should **not** invent or own ticket logic.

Accepted direction:
- ticket generation belongs to the core runtime
- ticket validation belongs to the core runtime
- ticket matching / staleness checks belong to the core runtime

The React layer only binds UI callbacks to the current core-issued ticket/handle.

## Opaque core-issued handle direction

The previously shown `ticketId` in examples was only illustrative.

The preferred design is:
- the core exposes or internally provides an **opaque ready handle/token**
- `markReady` is bound to that opaque handle
- later, the binding calls back into the core with that handle
- the core decides whether that handle is still current or stale

So the safety comes from the core, not from React inventing ticket rules.

## Consequence for stale async callbacks

If an old async task calls an old `markReady`:
- that callback is still bound to an older core-issued handle
- the core compares it against the current handle/ticket
- the call is ignored if stale

Therefore:
- no remount is required
- no global ready reset is required
- no stale callback can incorrectly acknowledge a newer run

## Practical meaning

For a selector such as:

`activeThreadReady::thread-A`

the coordinator may emit multiple successive tickets/handles over time.

Example:
- first navigation to A -> handle H1
- later navigation back to A -> handle H2

Then:
- `markReady(H1)` is valid only for the old cycle
- `markReady(H2)` is valid only for the new cycle
- a late call to the old callback must be ignored by the core

## React-binding implication

`useReadySignal(...)` should be understood as:

- observe the current ready handle for one selector
- expose a `markReady` callback bound to that current handle
- regenerate that callback only when the relevant ready handle changes

This keeps:
- the safety in the core
- the React layer thin
- the callback lifecycle aligned with the actual current ticket
