import { SignIn } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/sign-in/$")({
  component: SignInPage,
});

function SignInPage() {
  // source: https://clerk.com/docs/guides/development/customize-redirect-urls#redirect-url-props
  const redirectUrl = Route.useSearch({ select: (s) => s.redirect_url });
  return <SignIn forceRedirectUrl={redirectUrl} />;
}
