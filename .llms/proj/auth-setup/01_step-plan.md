Local bring-up
1. Set env vars: `VITE_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, Vite API URLs; add `.env.local` + Convex `.env`.
2. Install deps: `npm install @clerk/clerk-react convex @convex-dev/react-query @tanstack/router-plugin @tanstack/react-router @tanstack/react-query hono @orpc/client @orpc/server` (plus existing project deps).
3. Configure Vite: enable `tanstackRouter()` plugin before `@vitejs/plugin-react`; expose API base via `import.meta.env`.
4. Build router: generate route tree, wrap `<RouterProvider>` inside `<ClerkProvider><ConvexProviderWithClerk>` in `main.tsx`.
5. Convex client: init `ConvexReactClient` with env url; ensure queries use `ctx.auth.getUserIdentity()`.
6. Hono dev server: add token verification middleware calling `verifyToken` with `CLERK_JWT_KEY`; wire oRPC handler and expose CORS for `http://localhost:<vite-port>`.
7. Frontend API calls: use `const token = await getToken({ template: "convex" })` before fetch; include `Authorization` header.
8. Run stack: start Convex dev (`npx convex dev`), Hono server (`npm run dev:api`), Vite app (`npm run dev`); verify sign-in, API fetch, Convex query works end-to-end.
9. Add integration tests or manual checks verifying token exchange + CORS + data fetch.

Production rollout
1. Configure Clerk: create JWT template for Hono/Convex, set allowed origins/domains, ensure `azp` matches prod frontend and API domains.
2. Provision secrets: set env vars on hosting (static host for Vite, Convex prod dashboard, Hono platform) with publishable/secret keys and Convex url(s).
3. Harden Hono: enforce HTTPS, update CORS for prod origins, add rate limiting/logging, ensure `verifyToken` uses prod `CLERK_JWT_KEY` or remote JWK retrieval.
4. Build frontend: `npm run build`, upload `dist` to chosen static host (e.g. Netlify/Vercel/Cloudflare Pages); configure fallback to `/index.html`.
5. Deploy Convex prod: run `npx convex deploy`, verify auth config uses production Clerk issuer domain.
6. Deploy Hono API: push to hosting (Workers/Node/Bun), confirm environment has matching `applicationID`, template names, ORPC router.
7. Validate cross-domain auth: from deployed site sign in, call API, confirm tokens accepted; monitor logs for azp/aud mismatches.
8. Set up monitoring + alerting (Clerk webhooks, Convex logs, API metrics) and document rollback steps.
9. Final smoke tests: test multi-device login, sign-out flow, token refresh, Convex queries, error handling.
