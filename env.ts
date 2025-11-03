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
  shared: {
    // Base
    NODE_ENV: z.enum(["production", "development"]).default("development"),

    // Clerk
    CLERK_SECRET_KEY: z.string(),

    // AI
    GOOGLE_API_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
  },
  client: {
    // Origins
    PUBLIC_SERVER_ORIGIN: originSchema,
    PUBLIC_WEB_ORIGIN: originSchema,

    // Clerk
    PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    PUBLIC_CLERK_JWT_KEY: z.string(),
    PUBLIC_CLERK_SIGN_IN_URL: z.string(),
    PUBLIC_CLERK_SIGN_UP_URL: z.string(),

    // Convex
    PUBLIC_CONVEX_URL: z.string(),
    PUBLIC_CONVEX_HTTP_ACTION_URL: z.string(),
  },
  runtimeEnv: process.env,
});

export type Env = typeof env;
