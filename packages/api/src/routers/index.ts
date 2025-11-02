import { api } from "@ai-monorepo/convex/convex/_generated/api";
import { ORPCError } from "@orpc/client";
import { clerkAuthMiddleware } from "../libs/middlewares/clerk-auth";
import { convexContextMiddleware } from "../libs/middlewares/convex-helpers";
import { protectedProcedures, publicProcedures } from "../libs/orpc";

export const protectedRouter = {
  greeting: protectedProcedures.greeting
    .use(clerkAuthMiddleware)
    .use(convexContextMiddleware)
    .handler(async ({ context: { fetchQuery } }) => {
      // 1. Authentication
      const user = await fetchQuery(api.users.getCurrentUser);
      if (!user) throw new ORPCError("UNAUTHORIZED");

      return {
        text: `Hello user ${user.name} with ${user.tier} tier`,
      };
    }),
};

export const publicRouter = {
  greeting: publicProcedures.greeting.handler(() => ({
    text: "Hello from public endpoint",
  })),
};
