# PRD - Monorepo Typesafe Env Refactoring

## Problem Statement

The repo needs one coherent env model across apps and infra.

Current pain:
- env ownership unclear
- app runtime validation and infra typing overlap in confusing ways
- compile-time vs deploy-time vs runtime failure boundaries are blurry
- ambient/global env typing causes multi-worker collision risk

This causes drift and brittle refactors when env keys are added/removed/changed.

## Solution

Adopt an app-owned, contract-first env architecture.

Core rules:
1. Each app defines one canonical env contract in one place.
2. Contract sections are exactly: `private`, `public`, `bindings`.
3. `public` keys must start with configurable prefix (default `PUBLIC_`) and cannot be secret.
4. `private` keys must not start with public prefix and may be secret.
5. `bindings` are compile-time typed only (no runtime binding validation).
6. Infra must satisfy app contract exactly (missing/extra keys both fail typecheck).
7. Infra keeps separate infra-only env validator (existing plain `t3-env` usage remains).
8. No ambient/global `env.d.ts` strategy for app env access.
9. Shared packages in this scope do not use package env modules; they accept typed runtime config payload at init boundary.

Failure surfaces become deterministic:
- Compile-time: mapping/access mismatch
- Build/Deploy-time: missing infra env
- Runtime: invalid app env payload

## User Stories

1. As an app developer, I want one env contract source so I avoid duplicated schemas.
2. As an app developer, I want explicit `private/public/bindings` sections so intent is obvious.
3. As an app developer, I want typed env accessor usage so undeclared keys fail at compile-time.
4. As an app developer, I want transformed values inferred correctly so runtime parse and TS types stay aligned.
5. As an app developer, I want public prefix enforcement so private keys cannot leak.
6. As an app developer, I want secret semantics explicit so sensitive keys are modeled safely.
7. As an infra developer, I want compile-time failure when app adds required key and infra mapping is stale.
8. As an infra developer, I want compile-time failure when app removes key and infra still maps it.
9. As an infra developer, I want centralized infra composition retained.
10. As an infra developer, I want infra env validator to fail before provisioning if env is missing.
11. As a package author, I want typed config schema at init boundary instead of implicit env reads.
12. As a package integrator, I want compile-time safety when wiring package config from app env.
13. As a maintainer, I want no ambient env typing collisions across workers/apps.
14. As an architect, I want StandardSchemaV1 compatibility so validator choice remains flexible.
15. As a backend developer, I want typed Cloudflare binding access (D1/R2/KV/etc) in app code.
16. As a contributor, I want simple docs + examples so onboarding is fast.

## Implementation Decisions

- **Ownership**: app contract is canonical for app requirements.
- **Single definition**: one app contract derives runtime accessor types and infra requirement types.
- **Contract sections**: `private`, `public`, `bindings` only.
- **Public prefix**: configurable per contract; default `PUBLIC_`.
- **Visibility constraints**:
  - `public` key starts with prefix and cannot be secret
  - `private` key must not start with prefix and may be secret
- **Standards**: contract validation layer must remain StandardSchemaV1-compatible.
- **Secret model**: custom `Secret<T>` supported; common case `Secret<string>`.
- **Bindings typing policy**:
  - compile-time only
  - no runtime binding checks
  - v1 required support: Worker/Service, Queue, Durable Object, KV, R2, D1
  - architecture must be easily extensible toward all Alchemy Cloudflare resources
  - include one generic-typed binding example (worker/service style RPC typing)
- **Infra split**:
  - app-derived contract = what infra must map
  - infra-only validator = what infra process itself requires at run/deploy/dev/read
- **Infra validator**: keep current infra `env.ts` approach with plain `t3-env`; no redesign in scope.
- **Exactness**: infra map must fail typecheck on missing and extra keys.
- **Package scope (this PRD)**:
  - do not maintain package `env.ts`
  - package defines typed config schema + required init API input
  - consumer app passes config from app env accessor at runtime boundary
  - keep this minimal; long-term package config architecture deferred
- **Access policy**: app business logic reads only typed env accessor object.
- **Ambient policy**: no ambient/global `env.d.ts` for app env access.
- **Compatibility policy**: break old env APIs immediately (no compatibility layer).

## Testing Decisions

- No dedicated test suite in this workstream.
- Validation gate for this refactor: typechecking once full wiring is complete.
- Reason: intermediate phases will naturally fail typecheck until all contracts and mappings are migrated.
- Optional follow-up can add dedicated contract type tests and integration tests.

## Out of Scope

- broad infra topology redesign
- unrelated feature work/UI work
- broad framework migration
- runtime deep validation for Cloudflare binding object shapes
- long-term package configuration platform redesign

## Further Notes

### Mental Model

1. App defines one contract (`private/public/bindings`).
2. App builds typed runtime env accessor from same contract.
3. Infra derives required map type from same contract.
4. Infra maps vars/secrets/bindings exactly.
5. Infra runtime validator checks infra-only deploy env before resource operations.
6. Shared packages accept explicit typed config payload from consumer app.

### Conceptual Example

- App contract:
  - `private`: `APP_ENV`, `CORS_ORIGINS` (transform `string -> string[]`), `OPENAI_API_KEY` (secret)
  - `public`: `PUBLIC_APP_ORIGIN`
  - `bindings`: `DB` (D1), `FILES` (R2), `CACHE` (KV), `AUTH` (typed worker/service)
- App runtime accessor returns typed values and typed bindings.
- Infra mapping must satisfy exact contract keys, else compile error.
- Infra env validator must provide deploy-time source values, else infra run/deploy fails early.

## Acceptance Criteria

1. Adding app-required key causes infra compile error until mapping updated.
2. Removing app-required key causes infra stale-key compile error.
3. App access to undeclared env accessor key fails compile-time.
4. Public key not matching prefix fails contract.
5. Secret declared in `public` fails contract.
6. Private key using public prefix fails contract.
7. Missing infra deploy var fails infra validator before provisioning.
8. Package init requires explicit typed config payload from consumer app.
9. No ambient/global env typing required for app business logic.

## Rollout Plan

1. Build contract layer and type derivation.
2. Migrate one app end-to-end (runtime accessor + infra mapping).
3. Migrate infra mappings for remaining apps.
4. Rewire package config injection minimally (replace package env reads).
5. Migrate remaining app env usages.
6. Remove old env APIs and deprecated env package paths.

## TODOs

- TODO: finalize developer-facing contract DSL naming.
- TODO: define detailed migration checklist per app/package.
- TODO: define long-term package config architecture beyond minimal rewiring.
