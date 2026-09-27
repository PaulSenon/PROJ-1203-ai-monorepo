import { ORPCError } from "@orpc/client";
import { os } from "@orpc/server";
import {
  fetchMutation as fetchConvexMutation,
  fetchQuery as fetchConvexQuery,
} from "convex/nextjs";
import type { FunctionReference, OptionalRestArgs } from "convex/server";
import type { ClerkAuthContext, ServiceContext } from "../config.js";

export const convexContextMiddleware = os
  .$context<ClerkAuthContext & ServiceContext>()
  .middleware(async ({ context, next }) => {
    const token = await context.auth.getToken({ template: "convex" });
    if (!token) throw new ORPCError("UNAUTHORIZED");

    const fetchQuery = <Query extends FunctionReference<"query">>(
      query: Query,
      ...queryArgs: OptionalRestArgs<Query>
    ) =>
      fetchConvexQuery(query, queryArgs[0], {
        token,
        url: context.config.convex.url,
      });

    const fetchMutation = <Mutation extends FunctionReference<"mutation">>(
      mutation: Mutation,
      ...mutationArgs: OptionalRestArgs<Mutation>
    ) =>
      fetchConvexMutation(mutation, mutationArgs[0], {
        token,
        url: context.config.convex.url,
      });

    return next({
      context: {
        fetchQuery,
        fetchMutation,
      },
    });
  });
