import { useLayoutEffect } from "react";
import { useAppReadyNavigationIdentityAction } from "./use-app-ready";
import { useChatNav } from "./use-chat-nav";

export function AppReadyRouterBridge() {
  const chatNav = useChatNav();
  const { publishNavigationIdentity } = useAppReadyNavigationIdentityAction();

  useLayoutEffect(() => {
    // Bridge mirrors logical chat session identity, not URL persistence mode.
    publishNavigationIdentity({
      routeKind: "chat-thread",
      sessionId: chatNav.id,
    });
  }, [chatNav.id, publishNavigationIdentity]);

  return null;
}
