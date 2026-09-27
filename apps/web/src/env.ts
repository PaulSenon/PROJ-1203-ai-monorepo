/// <reference types="vite/client" />
import {
  createAppEnv,
  defineAppEnvContract,
  type InferRuntimeEnv,
} from "@ai-monorepo/env/app-env";
import z from "zod";

const webEnvContract = defineAppEnvContract({
  publicPrefix: "VITE_",
  private: {},
  public: {
    VITE_SERVER_URL: z.string().min(1),
    VITE_CONVEX_URL: z.string().min(1),
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    VITE_CLERK_SIGN_IN_URL: z.string().min(1),
    VITE_CLERK_SIGN_UP_URL: z.string().min(1),
  },
  bindings: {},
});

export type WebContract = typeof webEnvContract;
export type WebEnv = InferRuntimeEnv<WebContract>;

export const env = createAppEnv(webEnvContract, import.meta.env);
