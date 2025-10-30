import { createFileRoute, Outlet } from "@tanstack/react-router";
import z from "zod";

/**
 * Layout for all _auth pages.
 *
 * Simply validate the redirect_url search param we can provide while redirecting
 * manually in order to forward it to clerk auth components.
 */
export const Route = createFileRoute("/_auth")({
  component: () => <Outlet />,
  validateSearch: z.object({
    redirect_url: z.string().optional(),
  }),
});
