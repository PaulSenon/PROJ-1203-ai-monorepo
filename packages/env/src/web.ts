import type { WebEnvs } from "@ai-monorepo/infra/alchemy.run";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_CLERK_SIGN_IN_URL: z.string(),
    VITE_CLERK_SIGN_UP_URL: z.string(),
    VITE_SERVER_URL: z.string(),
    VITE_CLERK_PUBLISHABLE_KEY: z.string(),
    VITE_CONVEX_URL: z.string(),
  },
  // biome-ignore lint/suspicious/noExplicitAny: we are not in vite context here
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
}) satisfies WebEnvs;
// N.B. if satisfy error, go change bindings in alchemy.run.ts
