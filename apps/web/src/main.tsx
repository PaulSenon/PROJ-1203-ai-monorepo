import { createRouter, RouterProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import ReactDom from "react-dom/client";
import Loader from "./components/loader";
import { AuthProvider } from "./hooks/use-auth";
import { ConvexProvider } from "./hooks/use-convex";
import { routeTree } from "./routeTree.gen";
import { TanstackQueryClientProvider } from "./utils/tanstack-query/query-client-provider";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: {
    _placeholder: "",
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
      <AuthProvider>
        <ConvexProvider>
          <TanstackQueryClientProvider>{children}</TanstackQueryClientProvider>
        </ConvexProvider>
      </AuthProvider>
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
    return <>{children}</>;
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
  return <>{children}</>;
}

/**
 * Wire up some hooks to router context
 *
 * This is where you can use hook before injecting them in
 * RouterProvider context. It might. Because sometimes react
 * libs don't have easy hook alternatives, and you can't
 * call hook outside component. So here is a spot ready for that
 *
 * (remember that tanstack RouterContext is not reactive)
 */
function RouterWithContext() {
  // const example = useExample();
  return <RouterProvider context={{}} router={router} />;
}

function App() {
  return (
    <RouterWrapper>
      <RouterWithContext />
    </RouterWrapper>
  );
}

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
