import { env as cfEnv } from "cloudflare:workers";
import { createEnv } from "@t3-oss/env-core";
import z from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  server: {
    // Clerk
    CLERK_SECRET_KEY: z.string(),
  },
  client: {
    // Clerk
    PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    PUBLIC_CLERK_JWT_KEY: z.string(),
    // Convex
    PUBLIC_CONVEX_URL: z.string(),
  },
  runtimeEnv: cfEnv as Record<string, string>,
});
