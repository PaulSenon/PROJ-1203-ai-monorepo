# PRD - Typesafe Env Refactoring (Boundary-Safe, Runtime-Owned)

## Document Meta

- Status: ready-for-implementation
- Scope: `apps/web`, `apps/server`, `packages/api`, `packages/env`, `packages/infra`
- Priority: high (typecheck unblock + architecture boundary fix)
- Decision style: minimal churn, strict dependency direction

## TL;DR

Refactor env typing/validation so each runtime owns its env contract via app-side `createEnv`, while `packages/infra` keeps build-time fail-fast validation only.

Key outcome: remove env package -> infra leak causing web typecheck to transitively import `alchemy.run.ts` and fail with TS5097.

---

## 1) Root Problem

Current boundary leak:

- `apps/web` typecheck transitively reaches infra code through env-related imports.
- Infra includes `alchemy.run.ts` usage/imports requiring explicit `.ts` extension semantics for Alchemy tooling.
- Web TS config path hits TS5097 (`.ts` extension import disallowed in this context).

This proves architecture inversion:

- app/runtime code must not depend on infra package internals.
- env helpers must be infra-agnostic.

---

## 2) Goals

1. Keep one scalar env source of truth per runtime via `createEnv` (web/server/api runtime ownership).
2. Infer both parsed runtime env type and raw input env keys/types from same contract.
3. Keep infra pre-deploy validation (`packages/infra/env.ts`) for fail-fast.
4. Keep compile-time infra<->app contract via `bindings satisfies AppExportedContract`.
5. Enforce no reverse dependency: apps/packages never import infra.
6. Provide ergonomic API: `createContractEnv` + `InferEnvInput` without runtime phantom values.
7. Cloudflare env typing stays app-owned from `env.ts` exports, not infra-owned.

---

## 3) Non-Goals

- No runtime config service rollout.
- No secret manager migration.
- No cross-runtime mega-contract forcing all apps to share same env file.
- No immediate advanced DI graph for API package (keep minimal subset injection now).

---

## 4) Desired Architecture

### 4.1 Dependency Direction

- Allowed:
  - apps -> `packages/env`
  - infra -> app contract types (type-only) and own validator logic
- Forbidden:
  - apps/packages -> infra
  - `packages/env` -> infra

### 4.2 Ownership Model

- Runtime contract ownership:
- `apps/web`: `env.ts` is sole source for web public/browser env contract
- `apps/server`: `env.ts` is sole source for server + Cloudflare runtime env contract
  - `packages/api` (if needed): API runtime contract (or server-exported subset)
- Helper ownership:
  - `packages/env`: generic wrappers/types only (`createContractEnv`, infer helpers)
- Infra ownership:
  - `packages/infra/env.ts`: deployment-time validator + binding checks

### 4.3 Core API

- `createContractEnv(definition)` returns strongly typed runtime parser/validator object.
- `InferEnvInput<typeof env>` extracts raw input env map type from returned env.
- `InferEnv<typeof env>` extracts parsed runtime env type from returned env.

No required phantom runtime objects for type extraction.

---

## 5) Functional Requirements

- FR1: Web typecheck no longer imports any infra module transitively.
- FR2: Runtime env parsing remains typed and validated at runtime.
- FR3: Raw input env keys/types derivable from contract (`InferEnvInput`).
- FR4: Infra build-time env validation remains and fails pre-deploy on invalid/missing values.
- FR5: Infra<->app env contract compile-time check retained via `satisfies`.
- FR6: Cloudflare `Env` bindings typing declared in app-owned augmentation file.
- FR7: API package receives minimal DI env subset from server parsed env.

## 5.1 Non-Functional Requirements

- NFR1: No circular package dependency.
- NFR2: No runtime overhead increase outside existing parse/validation path.
- NFR3: Migration keeps behavior parity for successful deploy path.
- NFR4: Error surfaces become explicit by layer (app parse vs infra predeploy vs typecheck).

---

## 6) Detailed Design

### 6.1 `packages/env` (helper-only)

Implement/export:

- `createContractEnv<TSchema>(schema, options?)`
- `InferEnv<TContract>`
- `InferEnvInput<TContract>`
- optional utility types for key extraction / branded parsed output

Constraints:

- zero infra imports
- no project-specific bindings/Alchemy imports
- generic over chosen validator (existing stack choice unchanged)

### 6.2 App-owned contracts

- No standalone `*.contract.ts` files.
- No duplicated schema constants outside the `createContractEnv(...)` call.
- `apps/web/src/env.ts`: define contract inline in `createContractEnv(...)` with browser-safe keys only.
- `apps/server/src/env.ts`: define contract inline in `createContractEnv(...)` (vars + optional resource binding refs).
- `packages/api`: do not read global process/env directly in core logic; accept minimal injected parsed subset.

### 6.3 Infra validator

`packages/infra/env.ts` responsibilities:

- build/deploy-time validation of required env vars
- optional mapping/adaptation into infra tool format
- compile-time contract lock:
  - infra `bindings` object `satisfies` app-exported contract shape

Important: infra consumes app-exported types/contracts; reverse import is forbidden.

### 6.4 Cloudflare typing ownership

- No dedicated `env.cloudflare.d.ts` file in this refactor.
- Export `ServerWorkerEnv` type from `apps/server/src/env.ts` and use it explicitly at runtime boundaries (handler signatures, context wiring, adapter entrypoints).
- Infra must not declare authoritative runtime `Env` interface for app.
- App contract stays single source for runtime typing.

### 6.5 Resource bindings typing (DO / Queue / R2 / KV / Service Bindings)

When relevant, type bindings in app contract explicitly:

- Durable Objects: namespace + stub factories
- Queues: producer/consumer binding types
- R2/KV/D1: concrete platform binding types
- Service Bindings: typed as fetcher-style endpoints

Decision note:

- `WEB_APP` service binding idea explored for CORS-origin usage.
- Rejected for current use case: service binding gives fetch-capable binding, not canonical browser origin string.
- Keep as optional future pattern for server-to-server calls, not origin config source.

---

## 7) Alternatives Considered

### A) Keep env contract centralized in infra (current-ish)

- Pros: one location.
- Cons: keeps reverse dependency leak; app typecheck couples to infra toolchain; repeats TS5097 class risk.
- Verdict: reject.

### B) Duplicate contracts per layer manually

- Pros: easy local edits.
- Cons: drift risk; no compile-time linkage; higher maintenance.
- Verdict: reject.

### C) Runtime-only validation, no compile-time contract link

- Pros: simpler types.
- Cons: misses early contract drift detection infra<->app.
- Verdict: reject.

### D) Chosen: app-owned contracts + helper package + infra `satisfies` lock

- Pros: clean boundaries, typed inference, preserves fail-fast + compile-time guarantees.
- Cons: initial migration touches multiple packages.
- Verdict: accept.

---

## 8) Implementation Phases

### Phase 0 - Inventory + contract map

1. Locate all env reads and env-type exports in app/server/api/infra.
2. Classify each key by runtime owner (web/server/api/infra-only).
3. Identify current transitive import chain causing web->infra pull.

Deliverable:

- key ownership matrix + import graph note.

### Phase 1 - Build helper core in `packages/env`

1. Add `createContractEnv` and infer types (`InferEnv`, `InferEnvInput`).
2. Keep API ergonomic; no phantom object needed for extraction.
3. Add type tests for input/output inference.

Deliverable:

- helper package compile green + type tests.

### Phase 2 - Move runtime contracts to app ownership

1. Create/adjust `env.ts` in `apps/web` and `apps/server` (single source, inline contract).
2. Export `ServerWorkerEnv` from `apps/server/src/env.ts` and wire explicit type usage at entry boundaries.
3. Update app runtime parse call sites to use new contracts.

Deliverable:

- app/server compile green with no infra imports.

### Phase 3 - Infra validator alignment

1. Keep `packages/infra/env.ts` as pre-deploy validator.
2. Import app-exported contract types (type-only where possible).
3. Enforce `bindings satisfies AppContract` compile-time lock.

Deliverable:

- infra still fail-fast; compile-time lock active.

### Phase 4 - API minimal DI

1. Define minimal env subset type required by API package.
2. Inject subset from server parsed env at composition boundary.
3. Remove direct ambient env reads from API internals.

Deliverable:

- API package runtime independent from global env source.

### Phase 5 - Cleanup + guardrails

1. Remove deprecated env exports/import paths.
2. Add lint/arch rule if available: block app->infra imports.
3. Update docs/README snippets for new env flow.

Deliverable:

- boundary guardrails and docs complete.

---

## 9) Migration Plan (Safe Sequence)

1. Introduce helper API in `packages/env` first (non-breaking).
2. Dual-wire one runtime (server first recommended), keep old path temporary.
3. Migrate web runtime contract and ensure web typecheck isolation.
4. Switch infra validator to app-exported contract linkage.
5. Migrate API to DI subset.
6. Remove old env paths and enforce boundary checks.

Rollback:

- Each phase behind isolated commits; revert latest phase only if break occurs.
- Keep old contracts until next phase proven green.

---

## 10) Risk Register + Mitigation

- Risk: hidden transitive import still leaks infra.
  - Mitigation: explicit import graph check + boundary lint rule.
- Risk: contract drift between infra validator and app runtime contract.
  - Mitigation: `satisfies` compile-time binding lock.
- Risk: Cloudflare bindings typed in multiple places.
  - Mitigation: single app-owned `env.cloudflare.d.ts` authority.
- Risk: API DI migration partial, ambient env reads remain.
  - Mitigation: grep gate + codeowner checklist before merge.

---

## 11) Acceptance Criteria Checklist (Error Modes Mapped)

- [ ] AC1 - Boundary leak fixed: web typecheck does not import infra (`TS5097` path removed).
- [ ] AC2 - Missing required runtime var fails at runtime parse with clear typed error.
- [ ] AC3 - Invalid runtime var format fails at runtime parse with clear typed error.
- [ ] AC4 - Missing infra deploy var fails pre-deploy in `packages/infra/env.ts`.
- [ ] AC5 - Infra/app contract mismatch fails at compile-time via `satisfies`.
- [ ] AC6 - App code has zero imports from infra package.
- [ ] AC7 - `InferEnvInput` exposes raw input keys/types without phantom runtime value.
- [ ] AC8 - Cloudflare binding typing resolves from app-owned `env.ts` exports only (no dedicated d.ts file).
- [ ] AC9 - API package works with injected parsed subset; no direct ambient env dependency required.

---

## 12) Practical Notes for Implementers

- Keep contracts minimal per runtime; avoid one giant shared contract.
- Keep `createContractEnv(...)` call as the only schema declaration site in each runtime env file.
- Prefer type-only imports where runtime import unnecessary.
- Keep env key naming stable; avoid silent renames mid-migration.
- Add small focused type tests around `InferEnvInput`/`InferEnv` behavior.

---

## 13) Why This Is Correct

- Fixes root cause (dependency inversion), not just TS config symptom.
- Preserves both safety planes:
  - runtime parse safety in app
  - deploy-time fail-fast in infra
- Maintains infra<->app compile-time contract without allowing reverse runtime coupling.

---

## Unresolved Questions

- exact validator backend for `createContractEnv` stays current or abstract now?
- enforce boundary via lint rule, tsconfig paths, or both?
- API subset ownership: exported from server contract file or local API contract?
