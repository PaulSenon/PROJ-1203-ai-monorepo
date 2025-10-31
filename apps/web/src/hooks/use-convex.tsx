import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { env } from "@/env";

const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

export function ConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
