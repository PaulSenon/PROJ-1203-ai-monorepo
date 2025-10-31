import { env as cfEnv } from "cloudflare:workers";
import { createEnv } from "@t3-oss/env-core";
import z from "zod";

const originRegex =
  /^https?:\/\/(?:localhost(?::\d{1,5})?|([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+)$/;
const originSchema = z
  .string()
  .regex(
    originRegex,
    'Invalid Origin. (mind no trailing lash), example valid: "https://my.domain.com"'
  );

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  server: {
    // Clerk
    CLERK_SECRET_KEY: z.string(),
  },
  client: {
    // Origins
    PUBLIC_CORS_ORIGIN: originSchema,

    // Clerk
    PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    PUBLIC_CLERK_JWT_KEY: z.string(),
  },
  runtimeEnv: cfEnv as Record<string, string>,
}) satisfies typeof cfEnv;
// N.B. if satisfy error, go change bindings in alchemy.run.ts
