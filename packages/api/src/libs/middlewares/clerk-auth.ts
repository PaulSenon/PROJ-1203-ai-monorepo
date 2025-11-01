import { env } from "../../env";
import { createClerkClient } from "@clerk/backend";
import { ORPCError } from "@orpc/client";
import { type ClerkAuthContext, type RequestContext } from "../orpc";
import { os } from "../orpc";

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
