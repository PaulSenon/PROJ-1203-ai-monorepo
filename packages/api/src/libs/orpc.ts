// apps/server/src/lib/orpc.ts
import { implement } from "@orpc/server";
import { exampleContract } from "../contracts/exampleContract";
// import { clerkAuthMiddleware } from "./middlewares/clerk-auth";

export type RequestContext = {
  request: Request;
};

export type ClerkAuthContext = {
  auth: {
    getToken: (params?: { template: string }) => Promise<string | null>;
  };
};

export const os = implement(exampleContract);

const emptyContext = os.$context();
const requestContext = os.$context<RequestContext>();

export const publicProcedures = emptyContext.public;
export const protectedProcedures = requestContext.private;
