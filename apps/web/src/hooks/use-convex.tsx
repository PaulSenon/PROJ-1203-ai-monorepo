import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { env } from "@/env";

export const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

// TODO: see todo from use-auth.tsx where I talk about the confusion of separation of concern between convex an auth.
export function ConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
