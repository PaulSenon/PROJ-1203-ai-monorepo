import { env as cfEnv } from "cloudflare:workers";
import {
  createAppEnv,
  defineAppEnvContract,
  type InferRuntimeEnv,
  secret,
} from "@ai-monorepo/env/app-env";
import z from "zod";

export const serverEnvContract = defineAppEnvContract({
  publicPrefix: "PUBLIC_",
  private: {
    CLERK_SECRET_KEY: secret(z.string().min(1)),
    GOOGLE_API_KEY: secret(z.string().min(1)),
    OPENAI_API_KEY: secret(z.string().min(1)),
  },
  public: {
    PUBLIC_CORS_ORIGIN: z.string().min(1),
    PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    PUBLIC_CLERK_JWT_KEY: z.string().min(1),
    PUBLIC_CONVEX_URL: z.string().min(1),
  },
  bindings: {
    // EXAMPLE_R2_BINDING: binding<R2Bucket>(), // R2Bucket from cloudflare types from ts global "@cloudflare/workers-types"
  },
});

export type ServerContract = typeof serverEnvContract;
export type ServerEnv = InferRuntimeEnv<ServerContract>;

export const env = createAppEnv(
  serverEnvContract,
  cfEnv as Record<string, unknown>
);
