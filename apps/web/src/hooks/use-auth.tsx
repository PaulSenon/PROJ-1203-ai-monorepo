import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/clerk-react";
import type { ReactNode } from "react";

// TODO typed env
const VITE_CLERK_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string;
const VITE_CLERK_SIGN_IN_URL = import.meta.env.VITE_CLERK_SIGN_IN_URL as string;
const VITE_CLERK_SIGN_UP_URL = import.meta.env.VITE_CLERK_SIGN_UP_URL as string;

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

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={VITE_CLERK_PUBLISHABLE_KEY}
      signInUrl={VITE_CLERK_SIGN_IN_URL}
      signUpUrl={VITE_CLERK_SIGN_UP_URL}
    >
      {children}
    </ClerkProvider>
  );
}

import { Clerk } from "@clerk/clerk-js";

export const clerk = new Clerk(VITE_CLERK_PUBLISHABLE_KEY);
