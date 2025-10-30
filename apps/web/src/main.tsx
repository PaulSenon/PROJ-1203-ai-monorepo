import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import ReactDom from "react-dom/client";
import Loader from "./components/loader";
import { AuthProvider, initialAuthContext, useAuth } from "./hooks/use-auth";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./utils/orpc";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: {
    queryClient,
    auth: initialAuthContext,
  },
  Wrap({ children }) {
    /**
     * Wrapper level 2 (middle)
     *
     * For every global providers that does not need
     * router context access
     * What goes here:
     *   - Query clients
     *   - Theme provider
     *   - I18N provider
     */
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  },
  InnerWrap({ children }) {
    /**
     * Wrapper level 3 (bottom most)
     *
     * For everything needing router context access
     * What goes here:
     *   - Error boundaries using router info
     *   - Analytics / telemetry that reads current route
     *   - Layout or state derived from useRouter() / useSearch()
     *   - Router-aware suspense / loading UI providers
     */
    return <> {children}</>;
  },
});

/**
 * Wrapper level 1 (top most)
 *
 * Exception, put here ONLY what you need to
 * initialize Tanstack RouterProvider component
 * (e.g. setting up its context)
 * What goes here:
 *   - Auth provider (if needed at router context level)
 */
function RouterWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function RouterWithContext() {
  const auth = useAuth();
  return <RouterProvider context={{ auth }} router={router} />;
}

function App() {
  return (
    <RouterWrapper>
      <RouterWithContext />
    </RouterWrapper>
  );
}

// function InnerApp() {
//   const auth = useAuth();
//   return <RouterProvider context={{ auth }} router={router} />;
// }

// function App() {
//   return (
//     <AuthProvider>
//       <InnerApp />
//     </AuthProvider>
//   );
// }

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDom.createRoot(rootElement);
  root.render(<App />);
}
