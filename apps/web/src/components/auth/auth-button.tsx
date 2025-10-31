"use client";

import {
  SignInButton as ClerkSignInButton,
  SignUpButton as ClerkSignUpButton,
} from "@clerk/clerk-react";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import type React from "react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@/hooks/use-auth";
import { useSidebar } from "../ui/sidebar";

type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>;

/**
 * A custom Sign-In button that uses ShadCN's Button component and
 * opens Clerk's sign-in flow in a modal.
 */
export function SignInButton(
  props: { ref?: Ref<HTMLButtonElement> } & ButtonProps
) {
  const { setOpenMobile } = useSidebar();
  return (
    <ClerkSignInButton mode="modal">
      <Button
        {...props}
        onClick={() => {
          setOpenMobile(false);
        }}
        ref={props.ref}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    </ClerkSignInButton>
  );
}

/**
 * A custom Sign-Up button that uses ShadCN's Button component and
 * opens Clerk's sign-up flow in a modal.
 */
export function SignUpButton(
  props: { ref?: Ref<HTMLButtonElement> } & ButtonProps
) {
  return (
    <ClerkSignUpButton mode="modal">
      <Button {...props} ref={props.ref}>
        <UserPlus className="mr-2 h-4 w-4" />
        Sign Up
      </Button>
    </ClerkSignUpButton>
  );
}

/**
 * A custom Sign-Out button that uses the signOut action from our auth hook.
 */
export function SignOutButton(
  props: { ref?: Ref<HTMLButtonElement> } & ButtonProps
) {
  const { signOut } = useAuthActions();
  const handleSignOut = () => {
    signOut();
  };

  return (
    <Button onClick={handleSignOut} {...props} ref={props.ref}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  );
}
