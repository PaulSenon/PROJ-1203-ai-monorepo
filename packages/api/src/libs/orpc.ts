// apps/server/src/lib/orpc.ts

import type { SessionAuthObject } from "@clerk/backend";
import { implement, type MiddlewareResult, ORPCError } from "@orpc/server";
import { exampleContract } from "../contracts/exampleContract";

type Context = Record<never, never>;

type ClerkAuthContext = Context & {
  auth: SessionAuthObject | null;
};

export const os = implement(exampleContract);
export const baseContext = os.$context<Context>();
export const clerkAuthContext = os.$context<ClerkAuthContext>();

const authMiddleware = clerkAuthContext.middleware(
  ({
    context,
    next,
  }): MiddlewareResult<{ auth: SessionAuthObject }, unknown> => {
    if (!context.auth?.userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return next({
      context: {
        ...context,
        auth: context.auth,
      },
    });
  }
);

export const publicProcedures = baseContext.public;
export const protectedProcedures = clerkAuthContext.use(authMiddleware).private;
