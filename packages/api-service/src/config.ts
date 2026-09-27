import type { FunctionReference, OptionalRestArgs } from "convex/server";

export interface ApiConfig {
  clerk: {
    jwtKey: string;
    publishableKey: string;
    secretKey: string;
  };
  convex: {
    url: string;
  };
  ai: {
    googleApiKey: string;
    openaiApiKey: string;
  };
}

export interface RequestContext {
  request: Request;
}

export interface ClerkAuthContext {
  auth: {
    getToken: (params?: { template: string }) => Promise<string | null>;
  };
}

export interface ConvexContext {
  fetchQuery: <Query extends FunctionReference<"query">>(
    query: Query,
    ...queryArgs: OptionalRestArgs<Query>
  ) => Promise<unknown>;
  fetchMutation: <Mutation extends FunctionReference<"mutation">>(
    mutation: Mutation,
    ...mutationArgs: OptionalRestArgs<Mutation>
  ) => Promise<unknown>;
}

export interface ServiceContext extends RequestContext {
  config: ApiConfig;
}
