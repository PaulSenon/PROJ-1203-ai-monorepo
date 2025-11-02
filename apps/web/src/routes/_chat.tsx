import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_chat")({
  component: RouteComponent,

  wrapInSuspense: true,
});

function RouteComponent() {
  return (
    <>
      <h1>Chat Layout</h1>
      <Outlet />
    </>
  );
}
