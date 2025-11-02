import { createFileRoute } from "@tanstack/react-router";
import { Debug, DebugContextProvider } from "@/components/_debug/debug";

export const Route = createFileRoute("/chat/{-$id}")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DebugContextProvider>
      <Debug />
    </DebugContextProvider>
  );
}
