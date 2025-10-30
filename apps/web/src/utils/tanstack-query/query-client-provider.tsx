import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { tanstackQueryClient } from "./query-client";

export function TanstackQueryClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={tanstackQueryClient}>
      {children}
    </QueryClientProvider>
  );
}
