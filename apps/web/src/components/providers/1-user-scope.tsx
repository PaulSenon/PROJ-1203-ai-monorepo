import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { UserCacheProvider } from "@/hooks/use-user-cache";
import { TanstackQueryClientProvider } from "@/utils/tanstack-query/query-client-provider";

interface UserScopeContext {
  userId: string;
}
const UserScopeContext = createContext<UserScopeContext | null>(null);

export function useUserScope() {
  const ctx = useContext(UserScopeContext);

  if (ctx === null) {
    throw new Error(
      "[useUserScope()] must be used under [UserScopeContext] (provided by [UserScopeFromAuth] or manually via [UserScope])"
    );
  }

  return ctx;
}

/**
 * This is where you want to manually register all your context providers for
 * the user scope.
 *
 * //* role:
 * //* register here all your providers scoped to user lifetime.
 *
 * //* You can modify this
 */
function UserScopeExternalProviders({
  children,
  userId,
}: {
  children: React.ReactNode;
} & UserScopeContext) {
  return (
    <ConvexQueryCacheProvider
      debug={false}
      expiration={120_000}
      maxIdleEntries={100}
    >
      <TanstackQueryClientProvider>
        <UserCacheProvider userId={userId}>{children}</UserCacheProvider>
      </TanstackQueryClientProvider>
    </ConvexQueryCacheProvider>
  );
}

/**
 * @description
 * This is the piece bringing together:
 * - the user context (so anything bellow can resolve context via useUserScope)
 * - all your external user scoped context providers (that can then consume user context)
 *
 * //* role:
 * //* provide user context + all your external use-scoped contexts
 *
 * ! This is internal wrapper, do not modify
 */
function UserScopeContextProvider({
  userId,
  children,
}: {
  children: React.ReactNode;
} & UserScopeContext) {
  const userContextValue = useMemo(
    () => ({
      userId,
    }),
    [userId]
  );

  return (
    <UserScopeContext.Provider value={userContextValue}>
      <UserScopeExternalProviders userId={userId}>
        {children}
      </UserScopeExternalProviders>
    </UserScopeContext.Provider>
  );
}

/**
 * @description
 * This is the UserScopeContextProvider wrapper.
 * It is stable (skip rerender on same userId)
 * It provides all external user scoped providers
 * The full subtree is keyed by userId (so full remount when userId changes)
 * (this ensure all providers are reset on scope change)
 *
 * //* role:
 * //* internal keyed wrapper (memo + key reset)
 *
 * ! This is internal wrapper, do not modify
 */
const UserScope = React.memo(function _UserScope({
  userId,
  children,
}: {
  children: React.ReactNode;
} & UserScopeContext) {
  return (
    <UserScopeContextProvider key={userId} userId={userId}>
      {children}
    </UserScopeContextProvider>
  );
});

const LAST_LOGGED_USER_CACHE_KEY = "lastLoggedInUserId";
const ANONYMOUS_USER_ID = "anonymous";
const lastLoggedInUserIdCache = {
  get: () => localStorage.getItem(LAST_LOGGED_USER_CACHE_KEY),
  set: (userId: string) =>
    localStorage.setItem(LAST_LOGGED_USER_CACHE_KEY, userId),
};

/**
 * This is an self-contained version of UserScope,
 * will auto-infer current userId from auth state.
 *
 * //* role:
 * //* external use
 *
 * ! This is internal wrapper, do not modify
 */
export function UserScopeFromAuth({ children }: { children: React.ReactNode }) {
  const { clerkUser, isLoadingClerk } = useAuth();

  const userId = useMemo(() => {
    const lastLoggedInUser = lastLoggedInUserIdCache.get();

    // 1. fast cached returning user
    if (isLoadingClerk && lastLoggedInUser !== null) return lastLoggedInUser;

    // 3. when logged in
    return clerkUser?.id ?? ANONYMOUS_USER_ID;
  }, [clerkUser, isLoadingClerk]);

  // persist any last loggedIn userId to cache
  useEffect(() => {
    if (!userId) return;
    lastLoggedInUserIdCache.set(userId);
  }, [userId]);

  return <UserScope userId={userId}>{children}</UserScope>;
}
