import { useMatchRoute, useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { useCallback } from "react";
import { Route as ChatRoute } from "../routes/_chat/chat.{-$id}";

export function useChatNav() {
  const router = useRouter();
  const params = ChatRoute.useParams();
  const match = useMatchRoute();

  // TODO: This is weird, when transitioning from / to /id there is like two renders where match is false
  const paramsBroken = match({ to: "/chat/{-$id}" });
  console.log("params", paramsBroken, params);
  // if (params === false) {
  //   throw new Error("useChatNav must only be used under /chat/{-$id} route");
  // }
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
