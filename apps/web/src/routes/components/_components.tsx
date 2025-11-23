import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/components/_components")({
  component: () => <Outlet />,
});
