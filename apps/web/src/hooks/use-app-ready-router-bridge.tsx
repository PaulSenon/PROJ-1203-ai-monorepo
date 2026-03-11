import { useLayoutEffect } from "react";
import { Route as ChatRoute } from "@/routes/_chat/chat.{-$id}";
import { useAppReadyNavigationIdentityAction } from "./use-app-ready";

export function AppReadyRouterBridge() {
  const { id } = ChatRoute.useParams();
  const { publishNavigationIdentity } = useAppReadyNavigationIdentityAction();

  useLayoutEffect(() => {
    // Bridge only publishes identity. First-observation semantics live in core.
    publishNavigationIdentity({
      routeKind: "chat-thread",
      threadId: id ?? null,
    });
  }, [id, publishNavigationIdentity]);

  return null;
}
