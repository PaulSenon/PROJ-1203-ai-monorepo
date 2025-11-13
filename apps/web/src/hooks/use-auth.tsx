import {
  ClerkProvider,
  useClerk,
  useAuth as useClerkAuth,
  type useSession,
  useUser,
} from "@clerk/clerk-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { env } from "@/env";
import { createControllablePromise } from "@/helpers/controllable-promise-helper";

const VITE_CLERK_PUBLISHABLE_KEY = env.VITE_CLERK_PUBLISHABLE_KEY;
const VITE_CLERK_SIGN_IN_URL = env.VITE_CLERK_SIGN_IN_URL;
const VITE_CLERK_SIGN_UP_URL = env.VITE_CLERK_SIGN_UP_URL;

import { api } from "@ai-monorepo/convex/convex/_generated/api";
import { useConvexAuth, useMutation } from "convex/react";
import { ConvexProvider } from "./use-convex";

export type ClerkUser = NonNullable<
  NonNullable<ReturnType<typeof useUser>>["user"]
>;
export type ClerkSession = NonNullable<
  NonNullable<ReturnType<typeof useSession>>["session"]
>;

export type SignOutArgs = Parameters<ReturnType<typeof useClerk>["signOut"]>;

type AuthStatus =
  | "0_clerk_loading"
  | "1_clerk_loaded"
  | "1__A_clerk_signed_in"
  | "1__B_clerk_signed_out"
  | "2_convex_authenticated"
  | "3_user_ready";

/**
 * Enhanced auth hook that manages the full Clerk to Convex authentication lifecycle.
 * It provides clear state flags for building a snappy and robust UI.
 */
function useAuth_INTERNAL() {
  // Stage 1: Clerk Authentication
  const {
    user: _1_clerkUser,
    isLoaded: _1_isClerkLoaded,
    isSignedIn: _1_isClerkSignedIn,
  } = useUser();

  // Stage 2: Convex Client Authentication
  const {
    isLoading: _2_isConvexAuthLoading,
    isAuthenticated: _2_isConvexAuthenticated,
  } = useConvexAuth();

  // Stage 3: Application-level user setup
  const ensureConvexUserExists = useMutation(api.users.ensureUserExists);
  const [_3_isUserEnsured, setIsUserEnsured] = useState(false);

  useEffect(() => {
    // skip if stage 3 already ran
    if (_3_isUserEnsured) return;

    // skip if stage 2 is not authenticated
    if (!_2_isConvexAuthenticated) return;

    // ensure user exists
    const ensureUser = async () => {
      try {
        await ensureConvexUserExists();
        setIsUserEnsured(true);
      } catch (error) {
        console.error("Failed to ensure user exists in Convex:", error);
        // Optionally handle error state here
      }
    };
    ensureUser();
  }, [_2_isConvexAuthenticated, _3_isUserEnsured, ensureConvexUserExists]);

  // Clean up state on sign out
  const { signOut: clerkSignOut } = useClerkAuth();

  const signOut = useCallback(
    async (...args: Parameters<typeof clerkSignOut>) => {
      const [callback, options] = args;
      const wrappedCallback = () => {
        setIsUserEnsured(false);
        callback?.();
      };
      await clerkSignOut(wrappedCallback, options);
      // reload the page
      window.location.reload();
    },
    [clerkSignOut]
  );

  const authStatus: AuthStatus = useMemo(() => {
    if (!_1_isClerkLoaded) return "0_clerk_loading";
    if (_1_isClerkLoaded && !_1_isClerkSignedIn) return "1__B_clerk_signed_out";
    if (_1_isClerkLoaded && _1_isClerkSignedIn && !_2_isConvexAuthenticated)
      return "1__A_clerk_signed_in";
    if (
      _1_isClerkLoaded &&
      _1_isClerkSignedIn &&
      _2_isConvexAuthenticated &&
      !_3_isUserEnsured
    )
      return "2_convex_authenticated";
    if (
      _1_isClerkLoaded &&
      _1_isClerkSignedIn &&
      _2_isConvexAuthenticated &&
      _3_isUserEnsured
    )
      return "3_user_ready";
    return "0_clerk_loading";
  }, [
    _1_isClerkLoaded,
    _1_isClerkSignedIn,
    _2_isConvexAuthenticated,
    _3_isUserEnsured,
  ]);

  return {
    // Raw state from hooks
    clerkUser: _1_clerkUser,

    // stage 1
    isClerkLoaded: _1_isClerkLoaded,
    isClerkSignedIn: _1_isClerkSignedIn ?? false,

    // stage 2
    isConvexAuthLoading: _2_isConvexAuthLoading,
    isConvexAuthenticated: _2_isConvexAuthenticated,

    // stage 3
    isConvexUserEnsured: _3_isUserEnsured,

    /**
     * The current state string of the authentication process.
     */
    authStatus,

    // Actions
    signOut,
  };
}

type AuthState = {
  clerkUser: ClerkUser | null | undefined;
  isLoadingClerk: boolean;
  isSignedInClerk: boolean;
  isLoadingConvex: boolean;
  isAuthenticatedConvex: boolean;
  isReadyToUseConvex: boolean;
  isFullyReady: boolean;
  isAnonymous: boolean;
  status: AuthStatus;
};
type AuthActions = {
  signOut: (...args: SignOutArgs) => Promise<void>;
};

const AuthStateContext = createContext<AuthState | null>(null);
const AuthActionsContext = createContext<AuthActions | null>(null);

const AuthProvider_INTERNAL = ({ children }: { children: ReactNode }) => {
  // const { isAuthenticated, isLoading } = useConvexAuth();
  const {
    clerkUser,
    isClerkLoaded,
    isClerkSignedIn,
    isConvexAuthLoading,
    isConvexAuthenticated,
    isConvexUserEnsured,
    authStatus,
    signOut,
  } = useAuth_INTERNAL();

  const authState: AuthState = useMemo(
    () => ({
      clerkUser,
      isLoadingClerk: !isClerkLoaded,
      isSignedInClerk: isClerkSignedIn,
      isLoadingConvex: isConvexAuthLoading,
      isAuthenticatedConvex: isConvexAuthenticated,
      isFullyReady: isConvexUserEnsured,
      isAnonymous: isClerkLoaded && !isClerkSignedIn,
      isReadyToUseConvex: isConvexAuthenticated,
      status: authStatus,
    }),
    [
      clerkUser,
      isClerkLoaded,
      isClerkSignedIn,
      isConvexAuthLoading,
      isConvexAuthenticated,
      isConvexUserEnsured,
      authStatus,
    ]
  );
  const authActions: AuthActions = useMemo(
    () => ({
      signOut,
    }),
    [signOut]
  );

  return (
    <AuthActionsContext.Provider value={authActions}>
      <AuthStateContext.Provider value={authState}>
        {children}
      </AuthStateContext.Provider>
    </AuthActionsContext.Provider>
  );
};

export function useAuth() {
  const authState = useContext(AuthStateContext);
  if (!authState) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return authState;
}

export function useAuthActions() {
  const authActions = useContext(AuthActionsContext);
  if (!authActions) {
    throw new Error("useAuthActions must be used within an AuthProvider");
  }
  return authActions;
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
export const asyncSession = createControllablePromise<ClerkSession | null>();
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

// TODO: this is a bit confusion the separation of concern between convex an auth.
// because I need auth (clerk) above convex
// but I need convex above auth logic (because needed to ensure user exists etc.)
// for now we keep the mess, it works, but should perhaps be refactored into 3 entities:
// 1. ClerkAuthProvider
// 2. ConvexProvider
// 3. AuthProvider -> the thing used everywhere
// I mean it's kinda already the case, but that for externally we do <AuthProvider>{children}</AuthProvider>
// and it's not clear that it's also providing convex context...
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={VITE_CLERK_PUBLISHABLE_KEY}
      signInUrl={VITE_CLERK_SIGN_IN_URL}
      signUpUrl={VITE_CLERK_SIGN_UP_URL}
    >
      <AsyncSessionExtractorHackProvider>
        <ConvexProvider>
          <AuthProvider_INTERNAL>{children}</AuthProvider_INTERNAL>
        </ConvexProvider>
      </AsyncSessionExtractorHackProvider>
    </ClerkProvider>
  );
}
