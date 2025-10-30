import type { ExampleContract } from "@ai-monorepo/api/contracts/exampleContract";
import { createORPCClient, DynamicLink } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

// export const link = new RPCLink({
//   url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
//   headers: {},
// });

type ProtectedClientContext = {
  getToken(): Promise<string | null>;
};
const protectedLink = new RPCLink<ProtectedClientContext>({
  url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
  headers: async ({ context: { getToken } }) => {
    const token = await getToken();
    if (!token)
      console.error(
        "private request fired without token... There might be a sync issue"
      );
    return {
      authorization: `Bearer ${token}`,
    };
  },
});

const publicLink = new RPCLink({
  url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
});

const autoLink = new DynamicLink<ProtectedClientContext>(
  (options, path, inputs) => {
    console.log("autolink", { options, path, inputs });
    if (path[0] === "private") return protectedLink;
    return publicLink;
  }
);

/**
 * Hey, love your work and hope I don't bother you.
 * I have a specific question I can't figure out how to properly do what I want. And doc and everything isn't helping.
 * I hate bothering people for nothing so trust me that's not a random question I could have just googled.
 *
 * Global context:
 * - contract based
 * - hono api handler on back
 * - rpc link on front in a tanstack router/query app (static)
 * - auth provider (currently clerk but I guess we don't care)
 *
 * What I want to do:
 * - handle both public/private routes, by providing authorization header automatically on privates ones.
 * - be able to call useQuery(orpc.private.myEndpoint.queryOptions()); with automatic header token passed to queries
 *
 * Challenges:
 * - how to tell apart my private and public routes from contract (should it be tags, separate subrouters etc ?)
 * - how to create a typesafe link that could route rpc requests, for the privates it adds token in headers and therefore must wait for auth process to have finished before sending request (not sure it falls under orpc link responsibility though) and for public bypass this and do the request before auth is even ready
 * - having a hook-free (is possible) orpc object exported (createTanstackQueryUtils(client)) that I can use as intended.
 * - I get auth token and status from react hook.
 *
 * Initial ideas:
 * - split routes anyway (two routers for now)
 * - implement two RPCLinks, for public/private, and merge then in one DynamicLink (but can't find a way to route type-safely)
 * - private RPCLink require token access from ClientContext, so we can skip
 * -
 */

const client =
  createORPCClient<
    ContractRouterClient<ExampleContract, ProtectedClientContext>
  >(autoLink);

// export function useOrpc() {
//   const { getToken } = useAuth();
//   const token = use(getToken({ template: "convex" }));

//   const client = useMemo(
//     (): ContractRouterClient<ExampleContract> =>
//       createORPCClient(
//         new RPCLink({
//           url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
//           headers: {
//             authorization: `Bearer ${token}`,
//           },
//         })
//       ),
//     [token]
//   );

//   const orpc = useMemo(() => createTanstackQueryUtils(client), [client]);

//   return { client, orpc };
// }

// const client2: JsonifiedClient<ContractRouterClient<ExampleContract>> =
//   createORPCClient(link);
// const client: ContractRouterClient<ExampleContract> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
