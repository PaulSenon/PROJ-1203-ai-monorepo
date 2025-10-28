Clerk + Convex + TanStack Setup Notes

- Use `ClerkProvider` wrapping `ConvexProviderWithClerk` plus shared `ConvexReactClient`; enforce envs `VITE_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN` before bootstrapping. Attach Convex `auth.config.ts` provider `{ domain: process.env.CLERK_JWT_ISSUER_DOMAIN, applicationID: "convex" }` to validate Clerk JWTs and mount providers in `main.tsx` for the Vite entry (Clerk React Vite quickstart + Convex React docs).
- TanStack Router SPA: add `tanstackRouter()` plugin ahead of `@vitejs/plugin-react`, build your `routeTree`/`router`, and render `<RouterProvider router={router} />` inside the `<ClerkProvider><ConvexProviderWithClerk client={convex} useAuth={useAuth}>` shell so routing, auth, and Convex context stay client-side (tanstack/router Vite install guide + Convex React provider example).
- Cross-domain API auth: from React screens call `const token = await getToken({ template: "<your-template>" })` via `useAuth()` before hitting the Hono oRPC endpoint, send `Authorization: Bearer ${token}`, and ensure Clerk dashboard allows your frontend origin while Hono verifies with the same template/key (`getToken` hook docs + `verifyToken` backend reference). Include all domains in Clerk allowed origins or JWT template settings so the `azp` claim matches during verification.
- Convex functions require `ctx.auth.getUserIdentity()` checks before querying; sample query `api.messages.getForCurrentUser` filters by identity email to enforce per-user data access (Clerk Convex integration guide).
- Hono oRPC API: mount `RPCHandler` under `/rpc/*`; if upstream middleware consumes the body wrap request in a proxy to forward parser methods. Verify incoming Clerk token per request (`verifyToken` with `CLERK_JWT_KEY` or manual JWK flow) and pass claims into handler context for resolver auth (oRPC Hono adapter doc + Clerk manual verification guide).
- Vite static hosting: build with `npm run build` and deploy the `dist` folder to CDN hosts (Netlify, Vercel, Surge, Cloudflare Pages) using platform CLIs as outlined in the Vite static deployment guide; configure CORS on the Hono domain to accept auth-bearing requests from the app origin.

Resources

- https://github.com/clerk/clerk-docs/blob/main/docs/guides/development/integrations/databases/convex.mdx
- https://docs.convex.dev/auth/clerk
- https://github.com/clerk/clerk-docs/blob/main/prompts/react-vite-quickstart.md
- https://github.com/tanstack/router/blob/main/docs/router/framework/react/installation/manual.md
- https://github.com/clerk/clerk-docs/blob/main/docs/_partials/hooks/use-auth.mdx
- https://github.com/vitejs/vite/blob/main/docs/guide/static-deploy.md
- https://github.com/unnoq/orpc/blob/main/apps/content/docs/adapters/hono.md
- https://github.com/clerk/clerk-docs/blob/main/docs/guides/sessions/manual-jwt-verification.mdx
