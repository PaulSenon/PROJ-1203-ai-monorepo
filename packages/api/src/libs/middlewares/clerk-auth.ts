import { createClerkClient } from "@clerk/backend";
import { ORPCError } from "@orpc/client";
import { os } from "@orpc/server";
import { env } from "../../env";
import type { ClerkAuthContext, RequestContext } from "../orpc.context";

const client = createClerkClient({
  jwtKey: env.PUBLIC_CLERK_JWT_KEY,
  publishableKey: env.PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: env.CLERK_SECRET_KEY,
});

export const clerkAuthMiddleware = os
  .$context<RequestContext>()
  .middleware(async ({ context, next }) => {
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
