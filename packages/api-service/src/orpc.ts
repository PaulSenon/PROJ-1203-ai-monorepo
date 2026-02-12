import { contract } from "@ai-monorepo/api-contract/contract";
import { implement } from "@orpc/server";
import type { ServiceContext } from "./config.js";
import { clerkAuthMiddleware } from "./middlewares/clerk-auth.js";
import { convexContextMiddleware } from "./middlewares/convex-helpers.js";

// Export the base implementation with context type
export const os = implement(contract).$context<ServiceContext>();

// Public procedures (no auth required)
export const publicProcedures = os;

// Protected procedures (auth required)
export const protectedProcedures = os
  .use(clerkAuthMiddleware)
  .use(convexContextMiddleware);

export type { ApiConfig, ServiceContext } from "./config.js";
