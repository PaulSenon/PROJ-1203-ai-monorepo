import alchemy from "alchemy";
import { Vite, Worker } from "alchemy/cloudflare";
import { env } from "./env";

const app = await alchemy("ai-monorepo");

export const web = await Vite("web", {
  cwd: "apps/web",
  assets: "dist",
  bindings: {
    // Envs
    VITE_SERVER_URL: env.PUBLIC_SERVER_ORIGIN,
    VITE_CLERK_PUBLISHABLE_KEY: env.PUBLIC_CLERK_PUBLISHABLE_KEY,
    VITE_CLERK_SIGN_IN_URL: env.PUBLIC_CLERK_SIGN_IN_URL,
    VITE_CLERK_SIGN_UP_URL: env.PUBLIC_CLERK_SIGN_UP_URL,
    VITE_CONVEX_URL: env.PUBLIC_CONVEX_URL,
    // No secrets because static app
  },
  dev: {
    command: "pnpm run dev",
  },
});

export const server = await Worker("server", {
  cwd: "apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  placement: {
    mode: "smart",
  },
  bindings: {
    // Envs
    PUBLIC_CORS_ORIGIN: env.PUBLIC_WEB_ORIGIN,
    PUBLIC_CLERK_PUBLISHABLE_KEY: env.PUBLIC_CLERK_PUBLISHABLE_KEY,
    PUBLIC_CLERK_JWT_KEY: env.PUBLIC_CLERK_JWT_KEY,
    PUBLIC_CONVEX_URL: env.PUBLIC_CONVEX_URL,
    // Secrets
    CLERK_SECRET_KEY: alchemy.secret(env.CLERK_SECRET_KEY),
    GOOGLE_API_KEY: alchemy.secret(env.GOOGLE_API_KEY),
    OPENAI_API_KEY: alchemy.secret(env.OPENAI_API_KEY),
  },
  dev: {
    port: 3000,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
