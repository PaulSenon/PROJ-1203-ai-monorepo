"use client";

import { useClerk } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useCvxQueryCached } from "@/hooks/queries/convex/utils/use-convex-query-2-cached";
import { type ClerkUser, useAuth, useAuthActions } from "@/hooks/use-auth";
import { useUserCacheEntryOnce } from "@/hooks/use-user-cache";
import { cvx } from "@/lib/convex/queries";
import { cn } from "@/lib/utils";
import { useSidebar } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import { SignInButton } from "./auth-button";

interface UserProfileButtonProps {
  className?: string;
}

type ClerkUserSubset = Pick<
  ClerkUser,
  "imageUrl" | "fullName" | "firstName" | "lastName" | "emailAddresses"
>;

export function UserProfileButton({ className }: UserProfileButtonProps) {
  // TODO user preview from cache
  const { clerkUser, isFullyReady, isAnonymous } = useAuth();
  const cacheEntry = useUserCacheEntryOnce<ClerkUserSubset>(
    "user-profile-button"
  );

  // to use when non sensitive data is needed
  const staleUser = clerkUser || cacheEntry.snapshot || undefined;

  useEffect(() => {
    if (clerkUser) {
      cacheEntry.set({
        imageUrl: clerkUser.imageUrl,
        fullName: clerkUser.fullName,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        emailAddresses: [], // not cloneable
      });
    }
  }, [clerkUser, cacheEntry.set]);

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
          <UserAvatar user={staleUser} />
          <UserInfos />

          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-56 bg-background/50 backdrop-blur-md"
        forceMount
      >
        <UserDropDownMenuContent enabled={isFullyReady} user={staleUser} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserAvatar({
  user,
}: {
  user?: {
    imageUrl: ClerkUser["imageUrl"];
    fullName: ClerkUser["fullName"];
    firstName: ClerkUser["firstName"];
    lastName: ClerkUser["lastName"];
  };
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = user?.imageUrl;

  // biome-ignore lint/correctness/useExhaustiveDependencies: need to reset image error when image url changes
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  if (!user) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  const hasImageUrl = Boolean(user.imageUrl);
  const shouldShowFallback = !hasImageUrl || imageError;

  return (
    <Avatar className="h-8 w-8">
      {hasImageUrl && (
        <AvatarImage
          alt={user.fullName || "User"}
          onError={() => {
            setImageError(true);
          }}
          onLoad={() => {
            setImageError(false);
          }}
          src={user.imageUrl}
        />
      )}
      {shouldShowFallback && (
        <AvatarFallback className="text-sm">
          {user.firstName?.charAt(0) || "?"}
          {user.lastName?.charAt(0) || ""}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

function UserDropDownMenuContent({
  enabled,
  user,
}: {
  enabled: boolean;
  user?: {
    fullName: ClerkUser["fullName"];
    firstName: ClerkUser["firstName"];
    emailAddresses: ClerkUser["emailAddresses"];
  };
}) {
  const { signOut } = useAuthActions();
  const { setOpenMobile } = useSidebar();
  const { openUserProfile } = useClerk();

  if (!(enabled && user)) {
    return null;
  }

  return (
    <>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="font-medium text-sm leading-none">
            {user.fullName || user.firstName || "User"}
          </p>
          <p className="text-muted-foreground text-xs leading-none">
            {user.emailAddresses[0]?.emailAddress}
          </p>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuGroup>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            setOpenMobile(false);
            openUserProfile({
              appearance: {
                theme: dark,
              },
            });
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

function UserInfos() {
  const {
    data: user,
    isPending,
    isStale,
  } = useCvxQueryCached(...cvx.query.getCurrentUser().options.neverSkip());

  const tierText = () => {
    if (user?.tier === "free") return "Free";
    if (user?.tier === "premium-level-1") return "Premium";
    return "Free";
  };

  return (
    <div className="flex min-w-0 flex-col items-start">
      {user ? (
        <>
          <span className="max-w-32 truncate font-medium text-sm">
            {user?.name || user?.email || "User"}
          </span>
          <span
            className={cn("max-w-32 truncate text-muted-foreground text-xs")}
          >
            {tierText()}
          </span>
        </>
      ) : (
        <>
          <Skeleton className="mb-1 h-4 w-24 rounded-full" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </>
      )}
    </div>
  );
}
