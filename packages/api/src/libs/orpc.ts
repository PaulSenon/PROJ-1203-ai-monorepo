// apps/server/src/lib/orpc.ts
import { implement } from "@orpc/server";
import { exampleContract } from "../contracts/exampleContract";
import type { RequestContext } from "./orpc.context";
// import { clerkAuthMiddleware } from "./middlewares/clerk-auth";

export const os = implement(exampleContract);

const emptyContext = os.$context();
const requestContext = os.$context<RequestContext>();

export const publicProcedures = emptyContext.public;
export const protectedProcedures = requestContext.private;
