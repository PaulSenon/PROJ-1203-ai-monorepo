import {  os, type ClerkAuthContext } from "../orpc";
import { ORPCError } from "@orpc/client";
import { type FunctionReference, type OptionalRestArgs } from "convex/server";
import { fetchQuery as fetchConvexQuery, fetchMutation as fetchConvexMutation } from "convex/nextjs";
import { env } from "../../env";

export const convexContextMiddleware = os
  .$context<ClerkAuthContext>()
  .middleware(async ({ context, next }) => {
      const token = await context.auth.getToken({ template: "convex" });
      if (!token) throw new ORPCError("UNAUTHORIZED");
      const fetchQuery = <Query extends FunctionReference<"query">>(
        query: Query,
        ...queryArgs: OptionalRestArgs<Query>
      ) =>
        fetchConvexQuery(query, queryArgs[0], {
          token,
          url: env.PUBLIC_CONVEX_URL,
        });

      const fetchMutation = <Mutation extends FunctionReference<"mutation">>(
        mutation: Mutation,
        ...mutationArgs: OptionalRestArgs<Mutation>
      ) =>
        fetchConvexMutation(mutation, mutationArgs[0], {
          token,
          url: env.PUBLIC_CONVEX_URL,
        });
      return next({
        context: {
          fetchQuery,
          fetchMutation,
        },
      });
    }
  );