import { useMatchRoute, useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { useCallback } from "react";

export function useChatNav() {
  const router = useRouter();
  const match = useMatchRoute();
  const params = match({ to: "/chat/{-$id}" });
  if (!params) {
    throw new Error("useChatNav must only be used under /chat/{-$id} route");
  }
  const isNew = params.id === undefined;
  const id = params.id ?? nanoid();

  const persistNewChatIdToUrl = useCallback(() => {
    if (!isNew) return;
    router.navigate({
      to: "/chat/{-$id}",
      params: { id },
    });
  }, [isNew, id, router]);

  const openNewChat = useCallback(() => {
    router.navigate({
      to: "/chat/{-$id}",
      params: { id: undefined },
    });
  }, [router]);

  const openExistingChat = useCallback(
    (targetId: string) => {
      router.navigate({
        to: "/chat/{-$id}",
        params: { id: targetId },
      });
    },
    [router]
  );

  return {
    isNew,
    id,
    persistNewChatIdToUrl,
    openNewChat,
    openExistingChat,
  };
}
