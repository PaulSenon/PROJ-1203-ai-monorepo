import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { asyncSession } from "@/hooks/use-auth";

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ location }) => {
    const session = await asyncSession.wait();
    if (!session) {
      throw redirect({
        to: "/sign-in/$",
        search: {
          // Save current location for redirect after login
          redirect_url: location.href,
        },
      });
    }
  },
  component: () => <Outlet />,
});
