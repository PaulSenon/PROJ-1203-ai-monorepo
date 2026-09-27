# Setup & run (Docker-only) — reboot baseline

Written 2026-09-27 from a **static read** of `Makefile`, `docker/*`, `turbo.json`, `packages/infra/*`, `packages/env`, `apps/*/src/env.ts`. **Nothing here was executed** (no Docker/containers/services were started during the reboot prep). Treat unknowns as "verify when you run it".

## 0. Prerequisites (host)

- Docker + Docker Compose v2 (host had Docker 29.4.0 on 2026-09-27)
- `make`, `git` (+ SSH access to `github.com/PaulSenon/PROJ-1203-ai-monorepo`)
- Files/dirs mounted by `docker/docker-compose.dev.yml` must exist on host (all existed on 2026-09-27):
  - `~/.config/opencode/opencode.jsonc`, `~/.local/share/opencode/mcp-auth.json`, `~/.local/share/opencode/auth.json`
  - `~/.alchemy/` (mounted read-only)
- Accounts: Convex (dev deployment), Clerk (dev instance), OpenAI + Google AI API keys. Cloudflare only for deploy.

Inside the container: `node:22-slim` + corepack/pnpm, repo mounted at `/app`. `streamdown` resolves from `file:/app/.tmp/streamdown-2.3.0.tgz` → **install only works inside the container**.

## 1. Env / config files (where values live — never commit `*.local`)

| file | tracked? | vars (names only) | where to get values |
|---|---|---|---|
| `docker/.env.local` (compose `env_file`) | no (copy from `docker/.env.example`) | `CONTEXT7_API_KEY`, `AGENT_BROWSER_PROVIDER`, `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_API_KEY`, `OPENCODE_ATTACH_URL`, `RALPH_ALLOW_LOCAL_FALLBACK` | agent tooling only; not needed to run the app |
| `packages/infra/.env` | **yes** | `PUBLIC_CLERK_PUBLISHABLE_KEY`, `PUBLIC_CLERK_JWT_KEY` (public PEM), `PUBLIC_CLERK_SIGN_IN_URL`, `PUBLIC_CLERK_SIGN_UP_URL` | Clerk dashboard → API keys (publishable key, JWT public key) |
| `packages/infra/.env.development` | **yes** | `PUBLIC_WEB_ORIGIN`, `PUBLIC_SERVER_ORIGIN`, `PUBLIC_CONVEX_URL`, `PUBLIC_CONVEX_HTTP_ACTION_URL` | local origins + Convex dashboard (deployment URL / HTTP actions URL) |
| `packages/infra/.env.local` | no | `ALCHEMY_PASSWORD`, `CLERK_SECRET_KEY` | your own alchemy password; Clerk dashboard → secret key |
| `packages/infra/.env.development.local` | no | `CLERK_SECRET_KEY`, `__OPENAI_API_KEY`, `__GOOGLE_API_KEY` (`__ANTHROPIC_API_KEY` present but unused by server) | Clerk; OpenAI platform; Google AI Studio |
| `packages/infra/.env.production(.local)` | mixed | same names, prod values | only for `pnpm deploy` |
| `packages/backend/.env.local` | no | `CONVEX_DEPLOYMENT`, `CONVEX_URL`, `CONVEX_SITE_URL` | written by `convex dev` on first link |
| `packages/backend/.env`, `.env.development` | **yes** | `CLERK_JWT_ISSUER_DOMAIN` | Clerk dashboard (Frontend API / issuer URL) |
| Convex deployment env (dashboard) | — | `CLERK_JWT_ISSUER_DOMAIN` (read by `convex/auth.config.ts` via `process.env`) | Convex dashboard → Settings → Environment variables (likely already set; verify) |

How values flow: `packages/infra` runs `dotenvx run --convention=nextjs` (NODE_ENV=development → loads `.env.development.local`, `.env.local`, `.env.development`, `.env`) then `alchemy dev`, which injects `VITE_*` into the web app and `PUBLIC_*` + secrets (`CLERK_SECRET_KEY`, `OPENAI_API_KEY`←`__OPENAI_API_KEY`, `GOOGLE_API_KEY`←`__GOOGLE_API_KEY`) into the server Worker. Contracts: `apps/web/src/env.ts`, `apps/server/src/env.ts`, `packages/infra/env.ts`.

### `.env.enc` (encrypted backup of secrets)

- Untracked file at repo root, format "better-age encrypted env payload" (your tool: https://github.com/PaulSenon/better-age). Not referenced by any script.
- Backup copy: `~/ai-monorepo-backups/2026-09-27-reboot/.env.enc` (chmod 600).
- Decrypt with better-age per its README (CLI not installed on host on 2026-09-27; exact command not verified here). Only needed if a `*.local` file above is missing/lost — all of them existed locally on 2026-09-27.

## 2. First run

```sh
make help                 # list targets
make docker-build         # build dev image (also part of `make install`)
make convex-login         # only if Convex auth volume is empty/expired (volume-convex-auth)
make install              # docker-build + pnpm install (in container) + convex dev --until-success
make dev                  # runs `pnpm run dev` in container → turbo dev:
                          #   packages/infra  : dotenvx + alchemy dev (web Vite :3001, server Worker :3000)
                          #   packages/backend: convex dev (watch, pushes functions)
```

Open http://localhost:3001 (web). API on http://localhost:3000.

Checks (in container): `make run cmd="pnpm run check-types"`, `make run cmd="pnpm -F web run test"`, `make run cmd="pnpm run lint"`.

## 3. Stop / restart / reset

```sh
# stop: Ctrl+C in the `make dev` terminal, then
make stop                 # docker compose down --remove-orphans
make dev                  # restart
make bash                 # shell in container
make clean-soft           # pnpm clean + remove containers/images, KEEP volumes (convex/opencode auth)
make clean-install        # nuke containers+volumes, rebuild, reinstall, convex once (you will need convex-login again)
```

## 4. Likely failure points after 5 months (not verified)

- Expired/rotated keys: Clerk dev instance, OpenAI, Google (fix together on `chore/reboot`)
- Convex dev deployment paused/deleted → `make convex-login` + relink (`CONVEX_DEPLOYMENT`)
- Model ids in `packages/ai/src/model.registry.ts` may be retired (e.g. `google:gemini-3-flash-preview`)
- `pnpm install` inside container may re-resolve deps if the store volume is gone (lockfile is committed; should be deterministic)
- Pre-existing: `check-types` TS6305 in `apps/server` (api-service dist build order)

## 5. Manual test checklist (baseline, desktop + mobile viewport)

- [ ] App loads at :3001, no console errors blocking UI
- [ ] Sign in (Clerk) · sign out (known broken: logged-out state)
- [ ] New chat → send → assistant streams → completes (OpenAI model, then a Google model)
- [ ] Refresh mid-stream → stream resumes, no empty flash
- [ ] Same thread in 2 windows while streaming
- [ ] Switch threads quickly from sidebar (instant highlight + overlay, correct content)
- [ ] Long thread: opens at bottom, load older on scroll up, fast scroll up (Safari too)
- [ ] Sidebar: scroll + load more, right-click/context menu, mobile open/close
- [ ] Model selector, code block highlighting, math, link safety modal
- [ ] Draft persistence (known broken)
- [ ] Record results in `baseline-report.md` (this folder): works / broken + repro
