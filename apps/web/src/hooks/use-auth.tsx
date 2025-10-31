import {
  ClerkProvider,
  useClerk,
  useAuth as useClerkAuth,
  type useSession,
} from "@clerk/clerk-react";
import { type ReactNode, useEffect } from "react";
import { env } from "@/env";
import { createControllablePromise } from "@/helpers/controllable-promise-helper";

const VITE_CLERK_PUBLISHABLE_KEY = env.VITE_CLERK_PUBLISHABLE_KEY;
const VITE_CLERK_SIGN_IN_URL = env.VITE_CLERK_SIGN_IN_URL;
const VITE_CLERK_SIGN_UP_URL = env.VITE_CLERK_SIGN_UP_URL;

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
      <AsyncSessionExtractorHackProvider>
        {children}
      </AsyncSessionExtractorHackProvider>
    </ClerkProvider>
  );
}

/**
 * This is a big hack only because the only nice workaround was possible
 * with clerk-js package, and doing await(new Clerk(...)).load()
 * BUT this package is 2.5MB ... More than my full unoptimized app.
 * So instead I sneakily found a hack to rely only on the clerk-react package
 * (optimized) and give access to an awaitable thing to know when auth is ready
 * and to retrieve the token.
 *
 * How does it work:
 * we have a controllable promise generator (see implementation for details)
 * that allow to change what it resolve, and eventually pause it.
 * Then we use the useClerk hook that expose an event listener, and every time
 * something change we update our asyncSession promise returned value.
 * So when nothing ready, things that need auth loaded can do const session = await asyncSession.wait();
 * And those who need to know if we are authenticated can do session !== null or session?.user.id
 * And those who need a token can do await session.getToken().
 *
 * The setup is the following:
 * 1. have a global exported asyncSession ref that can be referenced by every consumers
 * 2. register the hook bellow in a wrapper of your app
 */
type Session = ReturnType<typeof useSession>["session"];
export const asyncSession = createControllablePromise<Session | null>();
function useAsyncSessionExtractorHack() {
  const { addListener } = useClerk();

  // biome-ignore lint/correctness/useExhaustiveDependencies: on mount only
  useEffect(() => {
    const unsubscribe = addListener(async (data) => {
      if (data.session?.user.id) {
        asyncSession.resolve(data.session);
      } else {
        asyncSession.resolve(null);
      }
    });
    return unsubscribe;
  }, []);
}
function AsyncSessionExtractorHackProvider({
  children,
}: {
  children: ReactNode;
}) {
  useAsyncSessionExtractorHack();
  return <> {children}</>;
}
