import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import type { ReactNode } from "react";

const CONVEX_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string;

export function useAuth() {
  // const { isAuthenticated, isLoading } = useConvexAuth();
  const { getToken, signOut, userId, isLoaded, isSignedIn } = useClerkAuth();

  return {
    getToken,
    signOut,
    userId,
    isLoaded,
    isSignedIn,
  };
}

export type AuthContext = ReturnType<typeof useAuth>;

export const initialAuthContext: AuthContext = {
  getToken: () => Promise.resolve(null),
  signOut: () => Promise.resolve(),
  isLoaded: false,
  isSignedIn: false,
  userId: undefined,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={CONVEX_PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  );
}
