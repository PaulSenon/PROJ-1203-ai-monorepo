import type { env as cfEnv } from "cloudflare:workers";
import { createEnv } from "@t3-oss/env-core";
import z from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_CLERK_SIGN_IN_URL: z.string(),
    VITE_CLERK_SIGN_UP_URL: z.string(),
    VITE_SERVER_URL: z.string(),
    VITE_CLERK_PUBLISHABLE_KEY: z.string(),
    VITE_CONVEX_URL: z.string(),
  },
  runtimeEnv: import.meta.env,
}) satisfies Omit<typeof cfEnv, "ASSETS">;
// N.B. if satisfy error, go change bindings in alchemy.run.ts
