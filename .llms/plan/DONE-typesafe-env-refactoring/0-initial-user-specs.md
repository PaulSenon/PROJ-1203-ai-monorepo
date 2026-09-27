# Typesafe Env Refactoring - Initial User Specs (No Solution)

## Intent

Clarify exact problem/needs/constraints for env architecture in monorepo. No implementation decision in this doc.

## Current Context

- Monorepo has centralized infra package and multiple apps/workers.
- Env setup currently feels reversed: infra typing influences app typing, while apps also need runtime validators.
- This creates dual source-of-truth risk and unclear ownership.

## Core Need

One clear env model that guarantees safety at:

- compile-time (contract mismatch)
- infra deploy/build-time (missing deploy env)
- app runtime (invalid runtime env payload)

And supports:

- plain env vars
- secrets
- transformed/coerced vars
- Cloudflare bindings (non-string runtime types)
- per-worker isolation (no cross-worker global type pollution)

## Mandatory Outcomes

1. Centralized infra composition must remain possible.
2. Infra-level validator must fail deploy/build when required infra env is missing.
3. Each app must have runtime env validation.
4. App env access must be typed via env accessor object.
5. Infra mapping must typecheck against app contract and fail on mismatch.
6. Adding env in app must force infra update via type error.
7. Removing env in app must fail infra on stale key and fail app on stale access.
8. No global env typing (`env.d.ts`) for app access pattern.
9. Shared package envs must be host-wired through explicit payload (not implicit process/global env read).

## Ownership Preferences

- Canonical env contract should be app-owned.
- Infra should satisfy app contracts, not define app contracts first.
- API/shared packages may keep env contract + parser, but parser input must come from host app payload.

## Technical Preferences

- One single contract definition per app env module should infer everything needed (runtime output types + infra input requirement types).
- Contract sections should be: `private`, `public`, `bindings`.
- `public` keys must start with configurable prefix (default `PUBLIC_`) and cannot be secret.
- `private` keys must not start with public prefix and may be secret.
- Keep public-prefix enforcement for client-exposed vars.
- Keep StandardSchemaV1 compatibility (not hard-locked to Zod-only validators).
- Cloudflare binding checks should be type-only (no runtime check).
- Binding support target should cover at least: Worker/Service, Queue, Durable Object, KV, R2, D1; ideally extensible to all Alchemy Cloudflare resources.
- Include at least one concrete generic-typed binding example (e.g. typed worker/RPC style) in PRD guidance.
- Infra-specific helpers/validators (e.g. env/stage/url checks) can stay infra-local and hardcoded there.
- Infra env validator can stay separate and keep using plain `t3-env`.
- Package-level env support is dropped in scope; use typed runtime config input for packages instead.

## Acceptance Guarantees (Behavior)

1. Infra misses required app key -> compile-time error.
2. Infra defines stale extra key -> compile-time error.
3. App reads unknown env key from typed accessor -> compile-time error.
4. App runtime payload invalid -> runtime validation error.
5. Infra required deploy var missing -> deploy/build-time error.
6. Package env payload missing/invalid when host wires it -> compile-time and/or runtime error at package init boundary.

## Scope Adjustment For Packages

- Do not keep `env.ts` in shared packages for this scope.
- Shared packages should define typed config schema (zod) and require config at runtime init API.
- Consumer app passes required config values from its own typed app env object.
- Ultimate package config architecture can be improved later; for this scope keep minimal working changes only.

## Non-Goals (for this doc)

- no implementation proposal details
- no migration execution
- no tool/library finalization

## Open Clarifications Still Needed Later

- exact contract DSL shape ergonomics for contributors
- long-term package config architecture (out of current scope)
