import { SignUp } from "@clerk/clerk-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/sign-up/$")({
  component: SignUpPage,
});

// TODO: issue: when signing up with redirectUrl on an already signed in account it does a intermediate redirect that lost the redirectUrl params and we end up on the home page

function SignUpPage() {
  // source: https://clerk.com/docs/guides/development/customize-redirect-urls#redirect-url-props
  const redirectUrl = Route.useSearch({ select: (s) => s.redirect_url });
  return <SignUp forceRedirectUrl={redirectUrl} />;
}
