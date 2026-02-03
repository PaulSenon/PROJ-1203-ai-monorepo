/// <reference path="../env.d.ts" />
// For Cloudflare Workers, env is accessed via cloudflare:workers module
// Types are defined in env.d.ts based on your alchemy.run.ts bindings
import { env as cfEnv } from "cloudflare:workers";
import type { ServerEnvs } from "@ai-monorepo/infra/alchemy.run";
import { createEnv } from "@t3-oss/env-core";
import z from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  server: {
    // Clerk
    CLERK_SECRET_KEY: z.string(),

    // AI
    GOOGLE_API_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
  },
  client: {
    // Origins
    PUBLIC_CORS_ORIGIN: z.string(),
    PUBLIC_CONVEX_URL: z.string(),

    // Clerk
    PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    PUBLIC_CLERK_JWT_KEY: z.string(),
  },
  runtimeEnv: cfEnv,
}) satisfies ServerEnvs;

// TODO find a typesafe way to validate this against envs in alchemy (must be a subset. No extra, but can miss some.)
// satisfies typeof cfEnv;
// N.B. if satisfy error, go change bindings in alchemy.run.ts
