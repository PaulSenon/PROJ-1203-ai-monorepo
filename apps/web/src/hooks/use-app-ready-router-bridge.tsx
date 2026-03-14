import { useLayoutEffect } from "react";
import { useAppReadyNavigationIdentityAction } from "./use-app-ready";
import { useChatNav } from "./use-chat-nav";

export function AppReadyRouterBridge() {
  const chatNav = useChatNav();
  const { publishNavigationIdentity } = useAppReadyNavigationIdentityAction();

  useLayoutEffect(() => {
    // Bridge follows instant chat-nav identity so blackout starts with shell nav feedback.
    publishNavigationIdentity({
      routeKind: "chat-thread",
      threadId: chatNav.isNew ? null : chatNav.id,
    });
  }, [chatNav.id, chatNav.isNew, publishNavigationIdentity]);

  return null;
}
