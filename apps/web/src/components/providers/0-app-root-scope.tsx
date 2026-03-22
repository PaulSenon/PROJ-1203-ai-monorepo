import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "../theme-provider";

/**
 * This is where you want to manually register all your context providers for
 * the app scope (never remount)
 *
 * //* role:
 * //* register here all your providers scoped to app lifetime.
 *
 * //* You can modify this
 */
function AppRootScopeExternalProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AuthProvider>
  );
}

/**
 * @description
 * This is the thing you want to wrap you full app with.
 * Will provide all your external context providers defined in above AppScopeExternalProviders
 *
 * //* role:
 * //* internal wrapper
 *
 * ! This is internal wrapper, do not modify
 */
export function AppRootScope({ children }: { children: React.ReactNode }) {
  return (
    <AppRootScopeExternalProviders>{children}</AppRootScopeExternalProviders>
  );
}
