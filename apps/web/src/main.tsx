import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDom from "react-dom/client";
import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./utils/orpc";

// const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const CONVEX_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string;

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <Loader />,
  context: { queryClient },
  Wrap({ children }: { children: React.ReactNode }) {
    return (
      //   <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ClerkProvider publishableKey={CONVEX_PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ClerkProvider>
      //   </ConvexProviderWithClerk>
    );
  },
});

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
  root.render(<RouterProvider router={router} />);
}
