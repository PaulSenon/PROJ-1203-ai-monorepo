import { createFileRoute, Outlet } from "@tanstack/react-router";
import Header from "@/components/header";

export const Route = createFileRoute("/_debug")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="group/sidebar-wrapper relative w-full min-w-0 flex-1">
      <Header />
      <h1>Debug Layout</h1>
      <Outlet />
    </main>
  );
}
