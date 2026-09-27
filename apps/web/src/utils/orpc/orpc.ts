import type { AppContract } from "@ai-monorepo/api-contract/contract";
import {
  createORPCClient,
  DynamicLink,
  type InferClientErrors,
  isDefinedError,
  ORPCError,
} from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { env } from "@/env";
import { asyncSession } from "@/hooks/use-auth";

/**
 * Link that add authorization bearer token to request
 * (slower because wait for auth)
 */
const linkWithAuthHeader = new RPCLink({
  url: `${env.VITE_SERVER_URL}/rpc`,
  headers: async () => {
    const session = await asyncSession.wait();
    const token = await session?.getToken();

    /**
     * We do skip request (because useless) if we don't have the token
     * but THIS IS NOT A SECURITY/AUTH FEATURE this is simply a skip
     * of a useless request.
     */
    if (!token) throw new ORPCError("UNAUTHORIZED");

    return {
      authorization: `Bearer ${token}`,
    };
  },
});

/**
 * Simple rpc link to use when no auth needed
 * (fast !)
 */
const linkDefault = new RPCLink({
  url: `${env.VITE_SERVER_URL}/rpc`,
});

// Route based on path - auth required for certain paths
const autoLink = new DynamicLink((_options, path, _inputs) => {
  // Private routes require auth
  if (path[0] === "demo" && path[1] === "private") return linkWithAuthHeader;
  if (path[0] === "chat") return linkWithAuthHeader;
  return linkDefault;
});

const client = createORPCClient<ContractRouterClient<AppContract>>(autoLink);

export const orpc = createTanstackQueryUtils(client);

// Specialized chat client
export const chatRpc =
  createORPCClient<ContractRouterClient<AppContract>>(linkWithAuthHeader);

type ChatRPCErrors = InferClientErrors<typeof chatRpc>["chat"];
export function isChatRPCError(
  error: unknown
): error is Extract<ChatRPCErrors, ORPCError<string, unknown>> {
  if (!(error instanceof Error)) return false;
  return isDefinedError<ChatRPCErrors>(error);
}
