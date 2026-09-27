import alchemy from "alchemy";
import { Vite, Worker } from "alchemy/cloudflare";
import type { ServerContract } from "../../apps/server/src/env.ts";
import type { WebContract } from "../../apps/web/src/env.ts";
import type { InferAlchemyInfraInput } from "./alchemy-infra-input.ts";
import { env } from "./env.ts";

const app = await alchemy("ai-monorepo", {
  password: env.ALCHEMY_PASSWORD,
});

export const web = await Vite("web", {
  cwd: "../../apps/web",
  assets: "dist",
  bindings: {
    VITE_SERVER_URL: env.PUBLIC_SERVER_ORIGIN,
    VITE_CLERK_PUBLISHABLE_KEY: env.PUBLIC_CLERK_PUBLISHABLE_KEY,
    VITE_CLERK_SIGN_IN_URL: env.PUBLIC_CLERK_SIGN_IN_URL,
    VITE_CLERK_SIGN_UP_URL: env.PUBLIC_CLERK_SIGN_UP_URL,
    VITE_CONVEX_URL: env.PUBLIC_CONVEX_URL,
  } satisfies InferAlchemyInfraInput<WebContract>,
  dev: {
    // command: "pnpm run dev",
    // command: "pnpm run build && pnpm run serve",
  },
});

// export const example_binding = await R2Bucket('example-bucket');
export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  limits: {
    cpu_ms: 60_000, // 1 minute (max 5 minutes)
  },
  placement: {
    mode: "smart",
  },
  bindings: {
    PUBLIC_CORS_ORIGIN: env.PUBLIC_WEB_ORIGIN,
    PUBLIC_CLERK_PUBLISHABLE_KEY: env.PUBLIC_CLERK_PUBLISHABLE_KEY,
    PUBLIC_CLERK_JWT_KEY: env.PUBLIC_CLERK_JWT_KEY,
    PUBLIC_CONVEX_URL: env.PUBLIC_CONVEX_URL,
    CLERK_SECRET_KEY: alchemy.secret(env.CLERK_SECRET_KEY),
    GOOGLE_API_KEY: alchemy.secret(env.__GOOGLE_API_KEY),
    OPENAI_API_KEY: alchemy.secret(env.__OPENAI_API_KEY),
    // EXAMPLE_R2_BINDING: example_binding,
  } satisfies InferAlchemyInfraInput<ServerContract>,
  // ,{
  //   EXAMPLE_R2_BINDING: typeof example_binding;
  // }
  dev: {
    port: 3000,
  },
});
export type ServerEnvs = Omit<typeof server.Env, "ASSETS">;

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
