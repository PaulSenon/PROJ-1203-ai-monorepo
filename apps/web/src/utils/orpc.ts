import type { ExampleContract } from "@ai-monorepo/api/contracts/exampleContract";
import { useAuth } from "@clerk/clerk-react";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { use, useMemo } from "react";
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

export function useOrpc() {
  const { getToken } = useAuth();
  const token = use(getToken({ template: "convex" }));

  const client = useMemo(
    (): ContractRouterClient<ExampleContract> =>
      createORPCClient(
        new RPCLink({
          url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
          headers: {
            authorization: `Bearer ${token}`,
          },
        })
      ),
    [token]
  );

  const orpc = useMemo(() => createTanstackQueryUtils(client), [client]);

  return { client, orpc };
}

// const client2: JsonifiedClient<ContractRouterClient<ExampleContract>> =
//   createORPCClient(link);
// const client: ContractRouterClient<ExampleContract> = createORPCClient(link);

// export const orpc = createTanstackQueryUtils(client);
