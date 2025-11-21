import { useRouter } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Route as ChatRoute } from "../routes/_chat/chat.{-$id}";

const ChatNavState = {
  isNew: false,
  id: nanoid(),
};

/**
 * @throws {Error} if used outside of /chat/{-$id} route
 */
export function useChatNav() {
  const router = useRouter();
  // this will throw an error if used outside of /chat/{-$id} route:
  const params = ChatRoute.useParams();
  const isNew = params.id === undefined;

  if (isNew && !ChatNavState.isNew) {
    ChatNavState.isNew = true;
    ChatNavState.id = nanoid();
  } else if (params.id !== undefined) {
    ChatNavState.isNew = false;
    ChatNavState.id = params.id;
  }
  const id = ChatNavState.id;

  useEffect(() => {
    console.log("DEBUG123: NAV chat nav id", id);
  }, [id]);

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

/**
 * Anything passed as an Outlet component will be re-rendered when the chat nav
 * changes.
 *
 * Perhaps there is a better way to handle this....
 */
export function ChatNavRerenderTrigger({
  Outlet,
}: {
  Outlet: React.ComponentType;
}) {
  const chatNav = useChatNav();
  const previousChatNavRef = useRef<typeof chatNav>(chatNav);

  const key = useMemo(() => {
    let res: string;
    // stable id when staying on the isNew page
    if (
      chatNav.isNew === true &&
      chatNav.isNew === previousChatNavRef.current.isNew
    ) {
      res = previousChatNavRef.current.id;
    } else {
      res = chatNav.id;
    }
    previousChatNavRef.current = { ...chatNav };
    return res;
  }, [chatNav]);

  useEffect(() => {
    console.log("DEBUG123: ChatNavRerenderer: key changed !", { key });
  }, [key]);

  return (
    <React.Fragment key={key}>
      <Outlet />
    </React.Fragment>
  );
}
