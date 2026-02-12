import { createClerkClient } from "@clerk/backend";
import { ORPCError } from "@orpc/client";
import { os } from "@orpc/server";
import type { ClerkAuthContext, ServiceContext } from "../config.js";

export const clerkAuthMiddleware = os
  .$context<ServiceContext>()
  .middleware(async ({ context, next }) => {
    const client = createClerkClient({
      jwtKey: context.config.clerk.jwtKey,
      publishableKey: context.config.clerk.publishableKey,
      secretKey: context.config.clerk.secretKey,
    });

    const authReqState = await client.authenticateRequest(context.request);
    const auth = authReqState.toAuth();
    if (!auth?.userId) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return next({
      context: {
        ...context,
        auth: {
          getToken: auth.getToken as ClerkAuthContext["auth"]["getToken"],
        },
      },
    });
  });
