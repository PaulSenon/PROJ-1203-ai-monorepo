import { useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { useCallback, useMemo } from "react";
import { Route as ChatRoute } from "../routes/_chat/chat.{-$id}";

/**
 * @throws {Error} if used outside of /chat/{-$id} route
 */
export function useChatNav() {
  const router = useRouter();
  // this will throw an error if used outside of /chat/{-$id} route:
  const params = ChatRoute.useParams();

  const isNew = params.id === undefined;
  const id = useMemo(() => params.id ?? nanoid(), [params.id]);

  const persistNewChatIdToUrl = useCallback(() => {
    if (!isNew) return;
    router.navigate({
      replace: true,
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
