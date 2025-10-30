import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ context, location }) => {
    await context.clerk.load();
    if (!context.clerk.isSignedIn) {
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
