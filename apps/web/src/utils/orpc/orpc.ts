import type { ExampleContract } from "@ai-monorepo/api/contracts/exampleContract";
import { createORPCClient, DynamicLink, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { asyncSession } from "@/hooks/use-auth";

/**
 * Link that add authorization bearer token to request
 * (slower because wait for auth)
 */
const linkWithAuthHeader = new RPCLink({
  url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
  headers: async () => {
    const session = await asyncSession.wait();
    const token = await session?.getToken({ template: "convex" });

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
 * Simples rpc link to use when no auth needed
 * (fast !)
 */
const linkDefault = new RPCLink({
  url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
});

// TODO: perhaps we might route on tags ? might be better
const autoLink = new DynamicLink((_options, path, _inputs) => {
  // console.log("autolink", { _options, path, _inputs });
  if (path[0] === "private") return linkWithAuthHeader;
  return linkDefault;
});

const client =
  createORPCClient<ContractRouterClient<ExampleContract>>(autoLink);

export const orpc = createTanstackQueryUtils(client);
