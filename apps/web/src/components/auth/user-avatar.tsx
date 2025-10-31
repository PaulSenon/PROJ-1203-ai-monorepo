"use client";

import { api } from "@ai-monorepo/convex/convex/_generated/api";
import { useClerk } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ClerkUser, useAuth, useAuthActions } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useSidebar } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import { SignInButton } from "./auth-button";

interface UserProfileButtonProps {
  className?: string;
}

export function UserProfileButton({ className }: UserProfileButtonProps) {
  const { clerkUser, isFullyReady, isLoadingClerk, isAnonymous } = useAuth();

  const disabled = !isFullyReady;

  if (isAnonymous) {
    return <SignInButton />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            "flex h-auto items-center gap-3 p-2 hover:border hover:bg-accent data-[state=open]:border data-[state=open]:bg-accent",
            className
          )}
          disabled={disabled}
          variant="ghost"
        >
          <UserAvatar
            clerkUser={clerkUser}
            isAnonymous={isAnonymous}
            isLoading={isLoadingClerk}
          />
          <UserInfos
            clerkUser={clerkUser}
            isAnonymous={isAnonymous}
            isLoading={isLoadingClerk}
          />

          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-56 bg-background/50 backdrop-blur-md"
        forceMount
      >
        <UserDropDownMenuContent
          clerkUser={clerkUser}
          isAnonymous={isAnonymous}
          isFullyReady={isFullyReady}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserAvatar({
  isLoading,
  isAnonymous,
  clerkUser,
}: {
  isLoading: boolean;
  isAnonymous: boolean;
  clerkUser?: ClerkUser;
}) {
  if (isLoading) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  if (isAnonymous) {
    return (
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-sm">A</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className="h-8 w-8">
      <AvatarImage
        alt={clerkUser?.fullName || "User"}
        src={clerkUser?.imageUrl}
      />
      <AvatarFallback className="text-sm">
        {clerkUser?.firstName?.charAt(0) || "U"}
        {clerkUser?.lastName?.charAt(0) || ""}
      </AvatarFallback>
    </Avatar>
  );
}

function UserDropDownMenuContent({
  isFullyReady,
  isAnonymous,
  clerkUser,
}: {
  isFullyReady: boolean;
  isAnonymous: boolean;
  clerkUser: ClerkUser;
}) {
  const { signOut } = useAuthActions();
  const { setOpenMobile } = useSidebar();
  const { openUserProfile } = useClerk();

  if (!isFullyReady || isAnonymous) {
    return null;
  }

  return (
    <>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="font-medium text-sm leading-none">
            {clerkUser?.fullName || clerkUser?.firstName || "User"}
          </p>
          <p className="text-muted-foreground text-xs leading-none">
            {clerkUser?.emailAddresses[0]?.emailAddress}
          </p>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuGroup>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            setOpenMobile(false);
            openUserProfile();
          }}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuItem
        className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
        onClick={() =>
          signOut(undefined, {
            redirectUrl: "/chat",
          })
        }
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Log out</span>
      </DropdownMenuItem>
    </>
  );
}

function UserInfos({
  isLoading,
  isAnonymous,
  clerkUser,
}: {
  isLoading: boolean;
  isAnonymous: boolean;
  clerkUser: ClerkUser;
}) {
  const convexUser = useQuery(api.users.getCurrentUser);
  const isConvexUserLoading = convexUser === undefined;

  return (
    <div className="flex min-w-0 flex-col items-start">
      {isLoading ? (
        <Skeleton className="mb-1 h-4 w-24 rounded-full" />
      ) : isAnonymous ? (
        <span className="max-w-32 truncate font-medium text-sm">Anonymous</span>
      ) : (
        <span className="max-w-32 truncate font-medium text-sm">
          {clerkUser?.fullName || clerkUser?.firstName || "User"}
        </span>
      )}

      {isAnonymous ? (
        <span className="max-w-32 truncate text-muted-foreground text-xs">
          {"---"}
        </span>
      ) : isLoading || isConvexUserLoading ? (
        <Skeleton className="h-3 w-16 rounded-full" />
      ) : (
        <span className={cn("max-w-32 truncate text-muted-foreground text-xs")}>
          {convexUser?.tier
            ? convexUser.tier === "free"
              ? "Free"
              : "Premium"
            : "Free"}
        </span>
      )}
    </div>
  );
}
